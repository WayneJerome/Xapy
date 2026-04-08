import asyncio
import os
from dotenv import load_dotenv

from infra.logger import setup_logger
from infra.config import config
from clients.mt5_monitor import MT5Monitor
from clients.mt5_client import MT5Client
from clients.tradelocker_client import TradeLockerClient
from engine.replicator import ReplicationEngine

load_dotenv()
logger = setup_logger("Main")

async def config_polling_loop():
    from infra.supabase_client import db_client
    while True:
        try:
            sys_cfg = await db_client.get_system_config()
            if sys_cfg:
                if "DEFAULT_SLIPPAGE_PCT" in sys_cfg:
                    config.DEFAULT_SLIPPAGE_PCT = float(sys_cfg["DEFAULT_SLIPPAGE_PCT"])
                if "MAX_LOT_SIZE" in sys_cfg:
                    config.MAX_LOT_SIZE = float(sys_cfg["MAX_LOT_SIZE"])
        except Exception as e:
            logger.error(f"Config polling loop error: {e}")
        await asyncio.sleep(5)

async def main():
    logger.info("Starting Xopy Replication Service...")
    
    # 1. Master Configuration (MT5 Example)
    master_login = int(os.getenv("MASTER_MT5_LOGIN", "0"))
    master_password = os.getenv("MASTER_MT5_PASSWORD", "")
    master_server = os.getenv("MASTER_MT5_SERVER", "")
    master_path = os.getenv("MASTER_MT5_PATH", "")

    if not master_login or not master_password:
        logger.error("Master MT5 credentials missing in environment variables. Set MASTER_MT5_LOGIN, MASTER_MT5_PASSWORD, and MASTER_MT5_SERVER.")
        return

    master_monitor = MT5Monitor(
        login=master_login,
        password=master_password,
        server=master_server,
        path=master_path
    )

    # 2. Slave Configurations (MT5 and/or TradeLocker)
    slave_clients = {}
    
    # Example MT5 Slave
    slave_mt5_login = int(os.getenv("SLAVE_MT5_LOGIN", "0"))
    if slave_mt5_login:
        slave_mt5 = MT5Client(
            login=slave_mt5_login,
            password=os.getenv("SLAVE_MT5_PASSWORD", ""),
            server=os.getenv("SLAVE_MT5_SERVER", ""),
            path=os.getenv("SLAVE_MT5_PATH", "")
        )
        if await slave_mt5.initialize():
            slave_clients[f"MT5_{slave_mt5_login}"] = slave_mt5
            
    # Example TradeLocker Slave
    tl_email = os.getenv("SLAVE_TL_EMAIL", "")
    if tl_email:
        slave_tl = TradeLockerClient(
            base_url=os.getenv("SLAVE_TL_URL", "https://demo.tradelocker.com/api"),
            email=tl_email,
            password=os.getenv("SLAVE_TL_PASSWORD", ""),
            server=os.getenv("SLAVE_TL_SERVER", "")
        )
        if await slave_tl.initialize():
            slave_clients[f"TL_{tl_email}"] = slave_tl

    if not slave_clients:
        logger.warning("No slave clients successfully initialized. Exiting.")
        return

    # 3. Engine Initialization
    engine = ReplicationEngine(master_monitor=master_monitor, slave_clients=slave_clients)
    
    # Start config polling loop
    asyncio.create_task(config_polling_loop())

    # 4. Start Master Monitor (Runs background polling loop)
    await master_monitor.start()
    
    logger.info("Service is running. Press Ctrl+C to exit.")
    
    try:
        # Keep main task alive
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        await master_monitor.stop()
        
        # Cleanup
        for client in slave_clients.values():
            if hasattr(client, "__aexit__"):
                 await client.__aexit__(None, None, None)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
