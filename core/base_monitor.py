from abc import ABC, abstractmethod
from typing import Callable, Awaitable
from core.models import TradeEvent

TradeCallback = Callable[[TradeEvent], Awaitable[None]]

class BaseMonitor(ABC):
    def __init__(self):
        self._callbacks: list[TradeCallback] = []

    def on_trade_event(self, callback: TradeCallback):
        """Register a callback for when a trade event occurs"""
        self._callbacks.append(callback)

    async def _emit_event(self, event: TradeEvent):
        """Trigger all registered callbacks with the new event"""
        for callback in self._callbacks:
            await callback(event)

    @abstractmethod
    async def start(self):
        """Start listening or polling for events"""
        pass

    @abstractmethod
    async def stop(self):
        """Stop monitoring"""
        pass
