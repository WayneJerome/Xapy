import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    # Global risk settings
    DEFAULT_SLIPPAGE_PCT = float(os.getenv("DEFAULT_SLIPPAGE_PCT", "1.0"))
    MAX_LOT_SIZE = float(os.getenv("MAX_LOT_SIZE", "10.0"))

config = Config()
