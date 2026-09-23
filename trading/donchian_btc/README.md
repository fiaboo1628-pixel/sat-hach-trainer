# DonchianRevert — BTC M15 mean reversion (Binance USDT-M Futures)

## Chiến lược (`user_data/strategies/DonchianRevert.py`)
| Vai trò | Chỉ báo | Điều kiện |
|---|---|---|
| Tín hiệu | Donchian position (20 nến) | Long ≤ 0.074 · Short ≥ 0.944 (≈ 5% cực trị) |
| Trạng thái | ADX(14) | > 30 |
| Lọc bán tháo/mua đuổi | Volume / TB 96 nến | < 1.0 |
| Rủi ro | ATR(14) | ATR ≥ 0.4% giá; 1R = 3×ATR |

Thoát: SL −1R → khi lãi +2R bật trailing cách đỉnh/đáy 0.5R. Khối lượng: rủi ro 1% vốn/lệnh (tối đa x5).

## Kết quả backtest (01/2021 → 09/2026, phí 0.035%/chiều, funding 0.01%/8h)
Tổng **+35.2%**, ~**5.4%/năm**, max drawdown **18.3%**, profit factor **1.11**, 451 lệnh, thắng 38%.
Theo năm: 2021 +7.6% · 2022 +9.0% · 2023 +16.7% · 2024 −6.2% · 2025 +1.0% · 2026 +7.1%.
(Mua & giữ BTC cùng kỳ: +197%.)

## Quá trình rút ra
1. M15 BTC: mọi chỉ báo động lượng/xu hướng có IC **âm** ổn định 6/6 năm → đánh hồi, không đánh theo đà
   (VolatilitySystem breakout M15: −99%).
2. Chỉ báo dao động trùng lặp mạnh (BB%B≈CCI≈Donchian≈W%R≈RSI, ρ 0.86–0.98) → chỉ dùng 1.
3. ADX và Volume độc lập với tín hiệu và làm nhịp hồi mạnh hơn; lọc xu hướng 4h/phiên giao dịch thì vô ích.
4. Phí là nút thắt: lọc ATR ≥ 0.4% để phí chiếm phần nhỏ của R là cải tiến lớn nhất.
5. Donchian bền hơn BB%B khi lệch tham số (tệ nhất −4.9% so với −11.5%).

## Hạn chế
- Dữ liệu Bitstamp BTC/USD spot, không phải Binance perpetual; funding giả định cố định.
- Donchian được chọn sau khi xem kết quả 2025–2026 → chưa có dữ liệu kiểm tra sạch.
- Lợi thế mỏng. **Hãy dry-run 1–2 tháng trước khi dùng tiền thật. Không phải lời khuyên đầu tư.**

## Chạy lại backtest offline
```bash
pip install freqtrade        # hoặc cài từ source
git clone --depth 1 https://github.com/ff137/bitstamp-btcusd-minute-data.git
python build_data.py
python run_futures.py backtesting -c cfg_fut.json --userdir user_data \
  --datadir user_data/data/binance --timerange 20210101- --strategy DonchianRevert --breakdown year
```
`run_futures.py` giả lập danh sách market Binance để chạy không cần mạng. Nếu có mạng tới Binance,
dùng `freqtrade backtesting` bình thường với dữ liệu tải bằng `download-data`.
