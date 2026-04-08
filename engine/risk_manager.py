from core.models import TradeEvent
from infra.config import config
from infra.logger import setup_logger

logger = setup_logger("RiskManager")

class RiskManager:
    @staticmethod
    def validate_volume(volume: float) -> bool:
        if volume <= 0:
            logger.warning("Calculated volume is <= 0")
            return False
            
        if volume > config.MAX_LOT_SIZE:
            logger.warning(f"Calculated volume {volume} exceeds max {config.MAX_LOT_SIZE}")
            return False
            
        return True
        
    @staticmethod
    def validate_slippage(master_price: float, current_market_price: float) -> bool:
        if master_price <= 0: return True 
        
        diff = abs(current_market_price - master_price)
        pct_diff = (diff / master_price) * 100.0
        
        if pct_diff > config.DEFAULT_SLIPPAGE_PCT:
            logger.warning(f"Slippage too high: {pct_diff:.2f}% (Limit: {config.DEFAULT_SLIPPAGE_PCT}%)")
            return False
        return True
