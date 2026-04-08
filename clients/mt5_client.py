import asyncio
import MetaTrader5 as mt5
from typing import List, Optional
from core.base_client import BaseClient
from core.models import OrderRequest, Position, AccountInfo, OrderSide
from infra.logger import setup_logger

logger = setup_logger("MT5Client")

class MT5Client(BaseClient):
    def __init__(self, login: int, password: str, server: str, path: str = ""):
        self.login = login
        self.password = password
        self.server = server
        self.path = path
        self.initialized = False

    async def initialize(self) -> bool:
        if self.path:
            init_res = mt5.initialize(path=self.path, login=self.login, password=self.password, server=self.server)
        else:
            init_res = mt5.initialize(login=self.login, password=self.password, server=self.server)

        if not init_res:
            logger.error(f"MT5 init failed, error code = {mt5.last_error()}")
            return False
            
        auth_res = mt5.login(self.login, password=self.password, server=self.server)
        if not auth_res:
             logger.error(f"MT5 login failed, error code = {mt5.last_error()}")
             return False
        
        self.initialized = True
        logger.info(f"MT5 Client initialized for {self.login} on {self.server}")
        return True

    async def get_account_info(self) -> Optional[AccountInfo]:
        if not self.initialized: return None
        acc_info = mt5.account_info()
        if acc_info is None:
            return None
        return AccountInfo(
            balance=acc_info.balance,
            equity=acc_info.equity,
            currency=acc_info.currency
        )
        
    async def get_positions(self) -> List[Position]:
        if not self.initialized: return []
        positions = mt5.positions_get()
        if positions is None:
            return []
            
        result = []
        for p in positions:
            side = OrderSide.BUY if p.type == mt5.ORDER_TYPE_BUY else OrderSide.SELL
            result.append(Position(
                ticket=str(p.ticket),
                symbol=p.symbol,
                side=side,
                volume=p.volume,
                open_price=p.price_open
            ))
        return result

    async def place_order(self, request: OrderRequest) -> Optional[str]:
        if not self.initialized: return None
        
        symbol_info = mt5.symbol_info(request.symbol)
        if symbol_info is None:
            logger.error(f"{request.symbol} not found")
            return None
            
        if not symbol_info.visible:
            if not mt5.symbol_select(request.symbol, True):
                logger.error(f"symbol_select({request.symbol}) failed")
                return None
        
        # Determine actual execution price
        tick = mt5.symbol_info_tick(request.symbol)
        if tick is None:
            logger.error(f"Could not get tick for {request.symbol}")
            return None
            
        is_buy = request.side == OrderSide.BUY
        order_type = mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL
        exec_price = tick.ask if is_buy else tick.bid
        
        # Stop loss logic - mapped from walkthrough fixing invalid stops
        point = symbol_info.point
        stops_level = symbol_info.trade_stops_level
        
        sl = request.sl
        tp = request.tp
        
        # Normalize stops based on min stops level
        min_stop_distance = point * (stops_level + 1)
        
        if sl:
            if is_buy:
                sl = min(sl, exec_price - min_stop_distance)
            else:
                sl = max(sl, exec_price + min_stop_distance)
                
        if tp:
            if is_buy:
                tp = max(tp, exec_price + min_stop_distance)
            else:
                tp = min(tp, exec_price - min_stop_distance)

        request_data = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": request.symbol,
            "volume": request.volume,
            "type": order_type,
            "price": exec_price,
            "sl": sl or 0.0,
            "tp": tp or 0.0,
            "deviation": 20,
            "magic": 234000,
            "comment": "Copied via Xopy",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request_data)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Order failed for {request.symbol}: retcode={result.retcode}, comment={result.comment}")
            return None
            
        logger.info(f"Opened {request.side} position on {request.symbol}: Ticket={result.order}")
        return str(result.order)

    async def close_position(self, ticket: str) -> bool:
        if not self.initialized: return False
        
        position = mt5.positions_get(ticket=int(ticket))
        if position is None or len(position) == 0:
            logger.warning(f"Position {ticket} not found to close.")
            return False
            
        p = position[0]
        tick = mt5.symbol_info_tick(p.symbol)
        if tick is None: return False
        
        type_dict = {
            mt5.ORDER_TYPE_BUY: mt5.ORDER_TYPE_SELL,
            mt5.ORDER_TYPE_SELL: mt5.ORDER_TYPE_BUY
        }
        price_dict = {
            mt5.ORDER_TYPE_BUY: tick.bid,
            mt5.ORDER_TYPE_SELL: tick.ask
        }
        
        close_request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": p.symbol,
            "volume": p.volume,
            "type": type_dict[p.type],
            "position": p.ticket,
            "price": price_dict[p.type],
            "deviation": 20,
            "magic": 234000,
            "comment": "Closed via Xopy",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(close_request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Failed to close {ticket}: {result.comment}")
            return False
            
        logger.info(f"Closed position {ticket}")
        return True
