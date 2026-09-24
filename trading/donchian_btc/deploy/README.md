# Paper trading (dry-run) trên máy nhà

Chạy DonchianRevert bằng giá Binance Futures thật nhưng **lệnh giả, ví ảo 1000 USDT, không cần API key**.
Gồm 3 phần, chạy bằng Docker (Windows, Mac, Linux đều được):

| Dịch vụ | Cổng | Việc |
|---|---|---|
| `live` | 8080 | Bot dry-run + FreqUI (xem lệnh, lãi lỗ, biểu đồ) |
| `lab` | 8081 | freqtrade webserver cho trang Chỉnh tham số backtest |
| `tuner` | 8090 | Trang "Chỉnh tham số": backtest thử, áp dụng tham số cho bot dry-run |

Mọi cổng chỉ mở trên `127.0.0.1` của máy. Xem từ điện thoại khi ra ngoài: dùng Tailscale (bước 5).

## 1. Cài Docker
- Windows / Mac: cài **Docker Desktop**, mở lên một lần. Trên Windows, dùng PowerShell cho các lệnh dưới.
- Linux: cài Docker Engine + plugin compose.

## 2. Lấy code
```bash
git clone https://github.com/fiaboo1628-pixel/sat-hach-trainer.git
cd sat-hach-trainer/trading/donchian_btc/deploy
```

## 3. Chuẩn bị (một lần)
```bash
docker compose run --rm setup
```
Tạo mật khẩu ngẫu nhiên, chép chiến lược cho LAB, tải nến 15m từ 2021 (vài phút).
**Ghi lại 2 dòng mật khẩu in ra** (quên thì chạy lại `docker compose run --rm setup --no-download`).

Muốn nhận thông báo lệnh qua Telegram: tạo bot với @BotFather lấy token, nhắn cho bot một tin rồi
lấy chat id (ví dụ qua @userinfobot), sau đó:
```bash
docker compose run --rm setup --no-download --telegram <token> <chat_id>
```

## 4. Chạy
```bash
docker compose up -d
```
Mở trên chính máy đó:
- http://localhost:8080 — FreqUI, đăng nhập `ft-live` / mật khẩu ở bước 3
- http://localhost:8090 — trang Chỉnh tham số, đăng nhập `admin` / mật khẩu ở bước 3

Bot tự khởi động lại khi máy khởi động lại (miễn là Docker tự chạy). **Tắt chế độ ngủ (sleep) của máy.**

## 5. Xem từ iPhone khi ra ngoài (Tailscale)
1. Cài Tailscale trên máy nhà và trên iPhone, đăng nhập cùng một tài khoản.
2. Trên máy nhà:
   ```bash
   tailscale serve --bg --https=443  http://127.0.0.1:8090
   tailscale serve --bg --https=8443 http://127.0.0.1:8080
   ```
3. Trên iPhone (bật Tailscale): mở `https://<tên-máy>.<tailnet>.ts.net` (trang Chỉnh tham số) và
   `https://<tên-máy>.<tailnet>.ts.net:8443` (FreqUI). Tên chính xác xem bằng `tailscale status`
   hoặc trong app Tailscale. Chỉ thiết bị trong tailnet của bạn mở được, không lộ ra internet.

## 6. (Tuỳ chọn) Vào lệnh trên tài khoản Binance Demo
Dry-run chỉ giả lập lệnh bên trong freqtrade. Muốn **thấy lệnh, vị thế, SL ngay trong app Binance**, cho bot
gửi lệnh lên tài khoản **Demo Trading** của Binance (tiền ảo của Binance, không phải tiền thật):

1. Vào demo.binance.com (hoặc app Binance → Demo Trading), mục Futures USDⓈ-M:
   đặt **One-way mode** (không dùng Hedge mode).
2. Avatar → **API Management** của tài khoản demo → tạo API key. Không bao giờ dùng key tài khoản thật ở đây.
3. Trên máy nhà:
   ```bash
   docker compose run --rm setup --demo      # hỏi API key + secret (gõ không hiện ra màn hình)
   docker compose up -d
   ```
   Bot khởi động lại, lấy số dư demo làm vốn, lịch sử lệnh ghi riêng vào `user_data/demo.sqlite`.
4. Quay về dry-run: `docker compose run --rm setup --dryrun` rồi `docker compose up -d`.

Lưu ý: freqtrade **chưa hỗ trợ chính thức** Demo Trading cho Binance; bộ này bật nó bằng tuỳ chọn
`_ft_has_params` trong `config.demo.json`. Nếu log báo lỗi lúc khởi động hoặc lúc đặt lệnh (đòn bẩy,
margin), quay về dry-run và gửi log để sửa. Trang Chỉnh tham số "Áp dụng" lúc này sẽ đổi tham số của bot demo.

## Lệnh hay dùng
```bash
docker compose ps                    # trạng thái
docker compose logs -f live          # log bot dry-run
docker compose restart live          # khởi động lại bot
docker compose down                  # dừng tất cả
git pull && docker compose pull && docker compose up -d   # cập nhật code + freqtrade
```

## Khác gì so với backtest
- Vào/ra lệnh bằng **lệnh market** ngay khi nến tín hiệu đóng (backtest vào ở giá mở nến sau — gần như nhau).
- Phí dry-run lấy theo **phí taker thật của Binance (0.05%/chiều)**, cao hơn mức 0.035% dùng khi backtest,
  nên kết quả sẽ kém backtest một chút. Funding tính theo mức thật.
- Chiến lược trung bình ~6–7 lệnh/tháng: chạy ít nhất 1–2 tháng rồi hẵng đánh giá. Nên so từng lệnh với
  backtest cùng khoảng thời gian (giá vào, SL, lúc kích hoạt trailing) hơn là chỉ nhìn lãi/lỗ.

## Ghi chú
- `secrets/`, `tuner.json`, `.env` chứa mật khẩu/key, đã có trong `.gitignore`. Không chia sẻ.
- Dữ liệu lệnh dry-run nằm ở `../user_data/dryrun.sqlite`; xoá file này để làm lại từ đầu với ví 1000 USDT.
- Linux báo lỗi quyền ghi: `sudo chown -R 1000:1000 ../user_data .`
- Mạng chặn Binance (lỗi 451/403 trong log): thử mạng khác hoặc VPN; không dùng máy chủ đặt ở Mỹ.
- Chạy tiền thật: **chưa**. Khi nào dry-run ổn mới bàn tiếp (cần API key, `dry_run: false`, giới hạn vốn).
