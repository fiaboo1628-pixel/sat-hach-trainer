# Chạy freqtrade futures offline: giả lập market BTC/USDT:USDT (Binance USDT-M perpetual).
import sys
from freqtrade.exchange.exchange import Exchange
M = {"BTC/USDT:USDT": {
    "id": "BTCUSDT", "symbol": "BTC/USDT:USDT", "base": "BTC", "quote": "USDT", "settle": "USDT",
    "active": True, "spot": False, "margin": False, "swap": True, "future": False, "type": "swap",
    "contract": True, "linear": True, "inverse": False, "contractSize": 1.0,
    "precision": {"amount": 0.001, "price": 0.1}, "info": {},
    "limits": {"amount": {"min": 0.001, "max": None}, "cost": {"min": 5, "max": None},
               "price": {"min": None, "max": None}, "leverage": {"min": 1, "max": 125}}}}
def fake_reload(self, force=False, *, load_leverage_tiers=True):
    self._markets = M; self._api.markets = M; self._api_async.markets = M
    self._last_markets_refresh = 10**13
    self._leverage_tiers = {"BTC/USDT:USDT": [
        {"minNotional": 0, "maxNotional": 10**9, "maintenanceMarginRate": 0.004, "maxLeverage": 125, "maintAmt": 0}]}
Exchange.reload_markets = fake_reload
Exchange.validate_timeframes = lambda self, tf: None
Exchange.fill_leverage_tiers = lambda self: None
from freqtrade.main import main
sys.exit(main(sys.argv[1:]))
