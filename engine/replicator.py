import asyncio
from typing import Dict, List
from core.base_client import BaseClient
from core.base_monitor import BaseMonitor
from core.models import TradeEvent, OrderRequest, AccountInfo
from engine.mapping import calculate_proportional_lot
from engine.risk_manager import RiskManager
from infra.supabase_client import db_client
from infra.logger import setup_logger

logger = setup_logger("ReplicatorEngine")

class ReplicationEngine:
    def __init__(self, master_monitor: BaseMonitor, slave_clients: Dict[str, BaseClient], master_balance_fallback: float = 10000.0):
        self.master_monitor = master_monitor
        self.slave_clients = slave_clients
        self.master_balance_fallback = master_balance_fallback
        self.master_monitor.on_trade_event(self.handle_trade_event)
        self.mapped_tickets = {} # MasterTicket -> {SlaveID: SlaveTicket}

    async def handle_trade_event(self, event: TradeEvent):
        if event.is_close:
            await self._handle_close(event)
        else:
            await self._handle_open(event)

    async def _handle_open(self, event: TradeEvent):
        logger.info(f"\n[{event.master_id}] => Replicating New Trade: {event.symbol} {event.side.value} {event.volume}")
        tasks = []
        for slave_id, client in self.slave_clients.items():
            tasks.append(self._execute_slave_trade(event, slave_id, client))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        self.mapped_tickets[event.ticket] = {}
        for res in results:
            if isinstance(res, tuple) and len(res) == 2:
                slave_id, ticket = res
                if ticket:
                    self.mapped_tickets[event.ticket][slave_id] = ticket
                    # Log mapping to Supabase
                    asyncio.create_task(db_client.log_trade({
                        "master_ticket": event.ticket,
                        "slave_id": slave_id,
                        "slave_ticket": ticket,
                        "symbol": event.symbol,
                        "action": "OPEN"
                    }))

    async def _execute_slave_trade(self, event: TradeEvent, slave_id: str, client: BaseClient):
        try:
            # 1. Get Accounts for proportional calculation
            slave_acc = await client.get_account_info()
            if not slave_acc:
                logger.error(f"[Slave {slave_id}] Could not fetch account info")
                return slave_id, None
                
            # 2. Calculate proportional volume
            base_master_bal = self.master_balance_fallback # In prod, fetch real master balance
            slave_vol = calculate_proportional_lot(event.volume, base_master_bal, slave_acc.balance, risk_multiplier=1.0)
            
            # 3. Risk Validations
            if not RiskManager.validate_volume(slave_vol):
                return slave_id, None
                
            # 4. Prepare request
            request = OrderRequest(
                symbol=event.symbol, 
                side=event.side,
                volume=slave_vol,
                price=event.price,
                sl=event.sl,
                tp=event.tp
            )
            
            # 5. Execute
            logger.info(f"[Slave {slave_id}] Executing: {slave_vol} lots on {event.symbol}")
            ticket = await client.place_order(request)
            return slave_id, ticket
            
        except Exception as e:
            logger.error(f"[Slave {slave_id}] Replication failed: {e}")
            return slave_id, None

    async def _handle_close(self, event: TradeEvent):
        logger.info(f"\n[{event.master_id}] => Replicating Close Trade: MasterTicket={event.ticket}")
        slave_tickets_map = self.mapped_tickets.get(event.ticket, {})
        
        if not slave_tickets_map:
            logger.warning(f"No slave mappings found for master ticket {event.ticket}")
            return
            
        tasks = []
        for slave_id, slave_ticket in slave_tickets_map.items():
            client = self.slave_clients.get(slave_id)
            if client:
                tasks.append(self._close_slave_trade(event, slave_id, client, slave_ticket))
                
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info(f"Completed replication close for MasterTicket={event.ticket}")

    async def _close_slave_trade(self, event: TradeEvent, slave_id: str, client: BaseClient, slave_ticket: str):
        success = await client.close_position(slave_ticket)
        if success:
             asyncio.create_task(db_client.log_trade({
                "master_ticket": event.ticket,
                "slave_id": slave_id,
                "slave_ticket": slave_ticket,
                "symbol": event.symbol,
                "action": "CLOSE"
            }))
        return success
