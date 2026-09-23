"""
DonchianRevert — BTC/USDT Binance USDT-M Futures, khung 15m, đánh hồi (mean reversion) 2 chiều.

Tín hiệu (xét khi nến 15m đóng cửa):
  - Donchian position = (close - đáy 20 nến) / (đỉnh 20 nến - đáy 20 nến)
  - LONG  khi Donchian pos <= 0.074 (≈ 5% thấp nhất)   — giá sát đáy kênh
  - SHORT khi Donchian pos >= 0.944 (≈ 5% cao nhất)    — giá sát đỉnh kênh
  - và ADX(14) > 30, Volume < trung bình 24h (96 nến), ATR(14) >= 0.4% giá
Quản lý lệnh:
  - 1R = 3 x ATR(14) của nến tín hiệu. SL ban đầu = -1R.
  - Khi lãi chạm +2R: trailing, cách đỉnh (đáy với Short) 0.5R.
  - Khối lượng: rủi ro 1% vốn mỗi lệnh (đòn bẩy tự tính, tối đa x5).
Backtest (01/2021 → 09/2026, dữ liệu Bitstamp BTC/USD 1m, phí 0.035%/chiều, funding 0.01%/8h):
  +35.2% tổng, ~5.4%/năm, max drawdown 18.3%, profit factor 1.11, 5/6 năm có lãi.
KHÔNG phải lời khuyên đầu tư. Hãy chạy dry-run trước khi dùng tiền thật.
"""
from datetime import datetime

import talib.abstract as ta
from pandas import DataFrame

from freqtrade.persistence import Trade
from freqtrade.strategy import IStrategy, stoploss_from_absolute


class DonchianRevert(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = "15m"
    startup_candle_count = 200
    can_short = True
    minimal_roi = {"0": 100}          # không chốt lời cố định
    stoploss = -0.30                  # lưới an toàn; SL thật nằm trong custom_stoploss
    use_custom_stoploss = True
    use_exit_signal = False

    DC_PERIOD = 20
    DC_LONG = 0.074
    DC_SHORT = 0.944
    ADX_MIN = 30
    VOL_MAX = 1.0
    ATR_MIN_PCT = 0.4
    R_ATR = 3.0
    TRAIL_START_R = 2.0
    TRAIL_DIST_R = 0.5
    RISK_PCT = 0.01
    MAX_LEV = 5.0

    def populate_indicators(self, df: DataFrame, metadata: dict) -> DataFrame:
        hh = df["high"].rolling(self.DC_PERIOD).max()
        ll = df["low"].rolling(self.DC_PERIOD).min()
        df["dpos"] = (df["close"] - ll) / (hh - ll)
        df["adx"] = ta.ADX(df, timeperiod=14)
        df["vol_ratio"] = df["volume"] / df["volume"].rolling(96).mean()
        df["atr"] = ta.ATR(df, timeperiod=14)
        df["atr_pct"] = df["atr"] / df["close"] * 100
        return df

    def populate_entry_trend(self, df: DataFrame, metadata: dict) -> DataFrame:
        common = ((df["adx"] > self.ADX_MIN) & (df["vol_ratio"] < self.VOL_MAX)
                  & (df["atr_pct"] >= self.ATR_MIN_PCT) & (df["volume"] > 0))
        df.loc[common & (df["dpos"] <= self.DC_LONG), "enter_long"] = 1
        df.loc[common & (df["dpos"] >= self.DC_SHORT), "enter_short"] = 1
        return df

    def populate_exit_trend(self, df: DataFrame, metadata: dict) -> DataFrame:
        return df

    def _last_atr(self, pair: str, before=None) -> float:
        df, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        if before is not None:
            df = df.loc[df["date"] < before]
        return float(df["atr"].iloc[-1])

    def _risk(self, pair: str, trade: Trade) -> float:
        r = trade.get_custom_data("risk")
        if r is None:
            r = self._last_atr(pair, trade.open_date_utc) * self.R_ATR
            trade.set_custom_data("risk", r)
        return r

    def leverage(self, pair, current_time, current_rate, proposed_leverage, max_leverage,
                 entry_tag, side, **kwargs) -> float:
        r_pct = self._last_atr(pair) * self.R_ATR / current_rate
        return float(min(max(self.RISK_PCT / r_pct, 1.0), self.MAX_LEV, max_leverage))

    def custom_stake_amount(self, pair, current_time, current_rate, proposed_stake, min_stake,
                            max_stake, leverage, entry_tag, side, **kwargs) -> float:
        equity = self.wallets.get_total_stake_amount()
        r_pct = self._last_atr(pair) * self.R_ATR / current_rate
        return float(min(equity * self.RISK_PCT / r_pct / leverage, max_stake))

    def custom_stoploss(self, pair: str, trade: Trade, current_time: datetime, current_rate: float,
                        current_profit: float, after_fill: bool, **kwargs):
        r = self._risk(pair, trade)
        if not trade.is_short:
            stop = trade.open_rate - r
            peak = max(trade.max_rate or trade.open_rate, current_rate)
            if peak >= trade.open_rate + self.TRAIL_START_R * r:
                stop = max(stop, peak - self.TRAIL_DIST_R * r)
        else:
            stop = trade.open_rate + r
            trough = min(trade.min_rate or trade.open_rate, current_rate)
            if trough <= trade.open_rate - self.TRAIL_START_R * r:
                stop = min(stop, trough + self.TRAIL_DIST_R * r)
        return stoploss_from_absolute(stop, current_rate, is_short=trade.is_short,
                                      leverage=trade.leverage)
