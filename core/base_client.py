from abc import ABC, abstractmethod
from typing import List, Optional
from core.models import OrderRequest, Position, AccountInfo

class BaseClient(ABC):
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize connection/auth for the client"""
        pass

    @abstractmethod
    async def get_account_info(self) -> Optional[AccountInfo]:
        """Get current account balance and equity"""
        pass

    @abstractmethod
    async def place_order(self, request: OrderRequest) -> Optional[str]:
        """Execute a trade, return ticket ID if successful"""
        pass

    @abstractmethod
    async def close_position(self, ticket: str) -> bool:
        """Close an existing position entirely"""
        pass

    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """Get all currently open positions"""
        pass
