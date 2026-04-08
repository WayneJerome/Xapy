from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import Optional, Dict, Any, List

class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class BrokerType(str, Enum):
    MT5 = "MT5"
    TRADELOCKER = "TRADELOCKER"

class TradeEvent(BaseModel):
    """Event emitted by MasterMonitor when a new trade happens or is closed"""
    model_config = ConfigDict(extra='ignore')
    
    ticket: str
    symbol: str
    side: OrderSide
    volume: float
    price: float
    sl: Optional[float] = None
    tp: Optional[float] = None
    broker: BrokerType
    master_id: str
    is_close: bool = False

class AccountInfo(BaseModel):
    balance: float
    equity: float
    currency: str

class OrderRequest(BaseModel):
    """Standardized order request passed to Slave execution"""
    symbol: str
    side: OrderSide
    volume: float
    price: Optional[float] = None # For calculating slippage/dynamic SL TP
    sl: Optional[float] = None
    tp: Optional[float] = None
    
class Position(BaseModel):
    ticket: str
    symbol: str
    side: OrderSide
    volume: float
    open_price: float
