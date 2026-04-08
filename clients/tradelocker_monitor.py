import asyncio
import socketio
from core.base_monitor import BaseMonitor
from core.models import TradeEvent, OrderSide, BrokerType
from infra.logger import setup_logger

logger = setup_logger("TradeLockerMonitor")

class TradeLockerMonitor(BaseMonitor):
    def __init__(self, brand_socket_url: str, access_token: str, account_id: str):
        super().__init__()
        self.brand_socket_url = brand_socket_url
        self.access_token = access_token
        self.account_id = account_id
        self.sio = socketio.AsyncClient(logger=False, engineio_logger=False)
        self._setup_events()

    def _setup_events(self):
        @self.sio.on('connect')
        async def on_connect():
            logger.info("Connected to TradeLocker BrandSocket")
            
        @self.sio.on('disconnect')
        async def on_disconnect():
             logger.warning("Disconnected from BrandSocket")
             
        @self.sio.on('positionCreated') 
        async def on_position(data):
            try:
                side = OrderSide.BUY if data.get("side") == "buy" else OrderSide.SELL
                event = TradeEvent(
                    ticket=str(data.get("id")),
                    symbol=str(data.get("tradableInstrumentId")),
                    side=side,
                    volume=float(data.get("qty", 0)),
                    price=float(data.get("price", 0)),
                    sl=float(data.get("stopLoss", 0)) if data.get("stopLoss") else None,
                    tp=float(data.get("takeProfit", 0)) if data.get("takeProfit") else None,
                    broker=BrokerType.TRADELOCKER,
                    master_id=str(self.account_id),
                    is_close=False
                )
                await self._emit_event(event)
            except Exception as e:
                logger.error(f"Error parsing BrandSocket event: {e}, {data}")
                
        @self.sio.on('positionClosed')
        async def on_position_closed(data):
            try:
                event = TradeEvent(
                    ticket=str(data.get("id")),
                    symbol=str(data.get("tradableInstrumentId")),
                    side=OrderSide.BUY,
                    volume=0, price=0,
                    broker=BrokerType.TRADELOCKER,
                    master_id=str(self.account_id),
                    is_close=True
                )
                await self._emit_event(event)
            except Exception as e:
                 logger.error(f"Error parsing close event: {e}")

    async def start(self):
        try:
            await self.sio.connect(
                f"{self.brand_socket_url}?token={self.access_token}", 
                transports=['websocket']
            )
            logger.info("TradeLocker Monitor Started")
        except Exception as e:
            logger.error(f"TL Monitor failed to start: {e}")

    async def stop(self):
        if self.sio.connected:
            await self.sio.disconnect()
            logger.info("TradeLocker Monitor Stopped")
