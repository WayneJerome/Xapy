import asyncio
import MetaTrader5 as mt5
from core.base_monitor import BaseMonitor
from core.models import TradeEvent, OrderSide, BrokerType
from infra.logger import setup_logger

logger = setup_logger("MT5Monitor")

class MT5Monitor(BaseMonitor):
    def __init__(self, login: int, password: str, server: str, path: str = "", poll_interval: float = 0.5):
        super().__init__()
        self.login = login
        self.password = password
        self.server = server
        self.path = path
        self.poll_interval = poll_interval
        self._running = False
        self._known_positions = set()
        self._task = None

    async def _init_mt5(self):
        if self.path:
            mt5.initialize(path=self.path, login=self.login, password=self.password, server=self.server)
        else:
            mt5.initialize(login=self.login, password=self.password, server=self.server)
        mt5.login(self.login, password=self.password, server=self.server)

    async def start(self):
        await self._init_mt5()
        self._running = True
        
        # Load initial positions
        positions = mt5.positions_get()
        if positions:
            for p in positions:
                self._known_positions.add(p.ticket)
                
        self._task = asyncio.create_task(self._poll_loop())
        logger.info(f"MT5 Monitor started on {self.server} for master {self.login}")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _poll_loop(self):
        while self._running:
            try:
                positions = mt5.positions_get()
                if positions is None:
                    await asyncio.sleep(self.poll_interval)
                    continue
                    
                current_tickets = {p.ticket for p in positions}
                
                # Check for new open positions
                for p in positions:
                    if p.ticket not in self._known_positions:
                        self._known_positions.add(p.ticket)
                        side = OrderSide.BUY if p.type == mt5.ORDER_TYPE_BUY else OrderSide.SELL
                        
                        event = TradeEvent(
                            ticket=str(p.ticket),
                            symbol=p.symbol,
                            side=side,
                            volume=p.volume,
                            price=p.price_open,
                            sl=p.sl if p.sl > 0 else None,
                            tp=p.tp if p.tp > 0 else None,
                            broker=BrokerType.MT5,
                            master_id=str(self.login),
                            is_close=False
                        )
                        await self._emit_event(event)

                # Check for closed positions
                closed_tickets = self._known_positions - current_tickets
                for ticket in closed_tickets:
                    self._known_positions.remove(ticket)
                    event = TradeEvent(
                        ticket=str(ticket),
                        symbol="UNKNOWN", 
                        side=OrderSide.BUY, 
                        volume=0.0,
                        price=0.0,
                        broker=BrokerType.MT5,
                        master_id=str(self.login),
                        is_close=True
                    )
                    await self._emit_event(event)
                    
            except Exception as e:
                logger.error(f"Error in MT5 polling loop: {e}")
                
            await asyncio.sleep(self.poll_interval)
