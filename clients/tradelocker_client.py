import asyncio
import aiohttp
from typing import List, Optional
from core.base_client import BaseClient
from core.models import OrderRequest, Position, AccountInfo, OrderSide
from infra.logger import setup_logger

logger = setup_logger("TradeLockerClient")

class TradeLockerClient(BaseClient):
    def __init__(self, base_url: str, email: str, password: str, server: str):
        self.base_url = base_url.rstrip('/')
        self.email = email
        self.password = password
        self.server = server
        self.access_token = None
        self.account_id = None
        self._session = None

    async def initialize(self) -> bool:
        self._session = aiohttp.ClientSession(headers={"Content-Type": "application/json"})
        
        login_payload = {
            "email": self.email,
            "password": self.password,
            "server": self.server
        }
        
        try:
            # Login
            async with self._session.post(f"{self.base_url}/auth/jwt/token", json=login_payload) as resp:
                if resp.status != 200:
                    logger.error(f"TL Login failed: {await resp.text()}")
                    return False
                data = await resp.json()
                self.access_token = data.get("accessToken")
                
            self._session.headers.update({"Authorization": f"Bearer {self.access_token}"})
            
            # Get Account ID
            async with self._session.get(f"{self.base_url}/auth/jwt/accounts") as resp:
                if resp.status != 200:
                    logger.error("TL failed to fetch accounts")
                    return False
                accounts = await resp.json()
                if not accounts or "accounts" not in accounts or len(accounts["accounts"]) == 0:
                     return False
                self.account_id = accounts["accounts"][0]
                
            self._session.headers.update({"accNum": str(self.account_id)})
            logger.info(f"TL Client initialized for account {self.account_id}")
            return True
        except Exception as e:
            logger.error(f"TL Init Exception: {e}")
            return False

    async def get_account_info(self) -> Optional[AccountInfo]:
        if not self._session or not self.account_id: return None
        try:
            async with self._session.get(f"{self.base_url}/trade/accounts/{self.account_id}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return AccountInfo(
                        balance=float(data.get("accountBalance", 0)),
                        equity=float(data.get("equity", 0)),
                        currency=data.get("currency", "USD")
                    )
        except Exception as e:
            logger.error(f"TL Account Info Error: {e}")
        return None

    async def get_positions(self) -> List[Position]:
        if not self._session: return []
        try:
            async with self._session.get(f"{self.base_url}/trade/positions") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    positions = data.get("d", {}).get("positions", [])
                    result = []
                    for p in positions:
                        side = OrderSide.BUY if p.get("side") == "buy" else OrderSide.SELL
                        result.append(Position(
                            ticket=str(p.get("id")),
                            symbol=str(p.get("tradableInstrumentId")),
                            side=side,
                            volume=float(p.get("qty", 0)),
                            open_price=float(p.get("price", 0))
                        ))
                    return result
        except Exception as e:
             logger.error(f"TL positions err: {e}")
        return []

    async def place_order(self, request: OrderRequest) -> Optional[str]:
        if not self._session: return None
        
        side_str = "buy" if request.side == OrderSide.BUY else "sell"
        order_payload = {
            "price": request.price or 0.0,
            "qty": request.volume,
            "routeId": 9999, 
            "side": side_str,
            "stopLoss": request.sl or 0.0,
            "takeProfit": request.tp or 0.0,
            "tradableInstrumentId": request.symbol, 
            "type": "market",
            "validity": "GTC"
        }
        
        try:
            async with self._session.post(f"{self.base_url}/trade/accounts/{self.account_id}/orders", json=order_payload) as resp:
                data = await resp.json()
                if resp.status in [200, 201] and data.get("s") == "ok":
                     order_id = data.get("d", {}).get("orderId")
                     logger.info(f"TL Order Placed: {order_id}")
                     return str(order_id)
                else:
                     logger.error(f"TL Order failed: {data}")
                     return None
        except Exception as e:
            logger.error(f"TL Order error: {e}")
            return None

    async def close_position(self, ticket: str) -> bool:
        if not self._session: return False
        try:
            async with self._session.delete(f"{self.base_url}/trade/positions/{ticket}") as resp:
                 if resp.status in [200, 204, 201]:
                     logger.info(f"TL Position {ticket} closed")
                     return True
                 else:
                     logger.error(f"TL Close failed: {await resp.text()}")
                     return False
        except Exception as e:
            logger.error(f"TL Close err: {e}")
            return False
            
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            await self._session.close()
