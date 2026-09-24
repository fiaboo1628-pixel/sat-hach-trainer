"""
Chuẩn bị lần đầu cho bộ dry-run. Chạy trong container (không cần cài Python trên máy):

    docker compose run --rm setup                       # tạo mật khẩu + tải dữ liệu nến
    docker compose run --rm setup --telegram <token> <chat_id>
    docker compose run --rm setup --no-download         # chỉ tạo mật khẩu

Việc làm:
  - secrets/live.json, secrets/lab.json: user/mật khẩu API ngẫu nhiên cho bot dry-run và LAB
  - tuner.json: cấu hình trang "Chỉnh tham số" (mật khẩu đăng nhập in ra màn hình)
  - chép chiến lược sang user_data/strategies_lab/ cho LAB
  - tải nến 15m BTC/USDT:USDT futures từ 2021 (kèm funding) để LAB backtest được
Chạy lại an toàn: file đã có thì giữ nguyên, trừ khi thêm --telegram.
"""
import argparse
import json
import secrets
import shutil
import subprocess
from pathlib import Path

DEPLOY = Path(__file__).resolve().parent
USER_DATA = Path("/freqtrade/user_data")
SECRETS = DEPLOY / "secrets"


def rand(n: int = 24) -> str:
    return secrets.token_urlsafe(n)


def api_creds(user: str) -> dict:
    return {"api_server": {"username": user, "password": rand(), "jwt_secret_key": rand(32),
                           "ws_token": rand()}}


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-download", action="store_true", help="bỏ qua tải dữ liệu nến")
    ap.add_argument("--telegram", nargs=2, metavar=("TOKEN", "CHAT_ID"), help="bật thông báo Telegram")
    ap.add_argument("--timerange", default="20210101-", help="khoảng dữ liệu cho LAB")
    args = ap.parse_args()

    SECRETS.mkdir(exist_ok=True)
    creds = {}
    for side in ("live", "lab"):
        f = SECRETS / f"{side}.json"
        if not f.exists():
            write_json(f, api_creds(f"ft-{side}"))
            print(f"Tạo {f.relative_to(DEPLOY)}")
        creds[side] = json.loads(f.read_text(encoding="utf-8"))

    if args.telegram:
        token, chat = args.telegram
        creds["live"]["telegram"] = {"enabled": True, "token": token, "chat_id": chat}
        write_json(SECRETS / "live.json", creds["live"])
        print("Bật Telegram cho bot dry-run")

    tuner = DEPLOY / "tuner.json"
    if not tuner.exists():
        password = rand(12)
        write_json(tuner, {
            "strategy": "DonchianRevert",
            "tuner": {"host": "0.0.0.0", "port": 8090, "username": "admin", "password": password},
            "lab": {"api_url": "http://lab:8081", **_login(creds["lab"]),
                    "strategy_dir": str(USER_DATA / "strategies_lab")},
            "live": {"api_url": "http://live:8080", **_login(creds["live"]),
                     "strategy_dir": str(USER_DATA / "strategies")},
        })
    t = json.loads(tuner.read_text(encoding="utf-8"))["tuner"]
    print(f"\nĐăng nhập trang Chỉnh tham số:  {t['username']} / {t['password']}")
    live = creds["live"]["api_server"]
    print(f"Đăng nhập FreqUI (bot dry-run): {live['username']} / {live['password']}")
    print("(Xem lại bất cứ lúc nào: chạy lại lệnh setup với --no-download)")

    lab_dir = USER_DATA / "strategies_lab"
    lab_dir.mkdir(parents=True, exist_ok=True)
    src = USER_DATA / "strategies" / "DonchianRevert.py"
    dst = lab_dir / "DonchianRevert.py"
    if not dst.exists() or dst.read_bytes() != src.read_bytes():
        shutil.copy2(src, dst)
        print(f"Chép chiến lược sang {dst}")

    if not args.no_download:
        print("\nTải dữ liệu nến (vài phút)…")
        subprocess.run([
            "freqtrade", "download-data", "--userdir", str(USER_DATA),
            "-c", str(DEPLOY / "config.base.json"), "-c", str(DEPLOY / "config.lab.json"),
            "--timerange", args.timerange, "--timeframes", "15m",
        ], check=True)
    print("\nXong. Tiếp theo: docker compose up -d")


def _login(c: dict) -> dict:
    return {"username": c["api_server"]["username"], "password": c["api_server"]["password"]}


if __name__ == "__main__":
    main()
