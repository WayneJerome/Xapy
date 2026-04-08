import asyncio
from supabase import create_client, Client
from infra.config import config
from infra.logger import setup_logger

logger = setup_logger("SupabaseClient")

class SupabaseClient:
    def __init__(self):
        self.url = config.SUPABASE_URL
        self.key = config.SUPABASE_KEY
        if not self.url or not self.key:
            logger.warning("Supabase configuration missing.")
            self.client = None
        else:
            self.client: Client = create_client(self.url, self.key)

    async def get_active_mappings(self):
        """Fetch configured master-to-slaves mapping from DB"""
        if not self.client: return []
        try:
            # Assumed table name for linking master to slaves
            # Should run in executor since supabase-py is synchronous under the hood, unless using supabase-py-async
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, lambda: self.client.table("replication_mappings").select("*").eq("is_active", True).execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Failed to fetch active mappings: {e}")
            return []

    async def get_system_config(self):
        """Fetch global configuration from system_config table"""
        if not self.client: return {}
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, lambda: self.client.table("system_config").select("*").execute()
            )
            config_dict = {}
            for item in response.data:
                config_dict[item.get("key")] = item.get("value")
            return config_dict
        except Exception as e:
            logger.error(f"Failed to fetch system config: {e}")
            return {}

    async def log_trade(self, data: dict):
        if not self.client: return
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None, lambda: self.client.table("trade_logs").insert(data).execute()
            )
        except Exception as e:
            logger.error(f"Failed to log trade to DB: {e}")

db_client = SupabaseClient()
