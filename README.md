# Sát Hạch Trainer

Module âm thanh sa hình — xem spec đầy đủ tại
`docs/superpowers/specs/2026-09-02-audio-sa-hinh-mvp-design.md`.

## Chạy thử local

Cần 1 static server (service worker yêu cầu http/https, không chạy được khi mở trực
tiếp bằng `file://`):

    npx serve .
    # hoặc
    python3 -m http.server 8080

Mở địa chỉ server báo ra (vd `http://localhost:8080`).

## Chạy test

    node --test test/

## Thay audio placeholder bằng nội dung thật

`content/audio/*.mp3` hiện là beep giả (sinh bởi `tools/gen-placeholder-audio.sh`) để
app chạy được trước khi có nội dung thật. Khi có text hiệu lệnh + tín hiệu thật:

1. Sinh file mp3 thật (TTS cho giọng đọc, hoặc tín hiệu ting-tong/tút riêng), đặt đúng
   tên như field `audio` trong `content/stations.json`, đè lên file placeholder trong
   `content/audio/`.
2. Tăng số version `CACHE_NAME` trong `service-worker.js` (vd `v1` → `v2`) để trình
   duyệt tải audio mới thay vì dùng bản cache cũ.

## Thay bộ câu hỏi lý thuyết placeholder bằng 600 câu thật

`content/theory/questions.json` hiện là 40 câu mẫu (`[Mẫu] ...`) để app chạy được
trước khi có nội dung thật — xem
`docs/superpowers/specs/2026-09-06-ly-thuyet-mvp-design.md` mục "Việc còn mở" (chọn
nguồn cào, cào 600 câu, QA ảnh) trước khi thay. Khi đã có data thật đã qua QA:

1. Đè `content/theory/questions.json` bằng 600 câu thật, giữ đúng `id` theo số câu
   chính thức (`q001`–`q600`) và đúng shape hiện có (`text`, `choices`, `answer`,
   `is_liet`, `chapter`, `image`).
2. Đặt ảnh biển báo/sa hình vào `content/theory/images/`, tên file khớp field `image`
   của từng câu.
3. Tăng số version `CACHE_NAME` trong `service-worker.js` (vd `v2` → `v3`) để trình
   duyệt tải nội dung mới thay vì dùng bản cache cũ.

## Deploy lên M710q (nginx, tự host)

    # trên M710q
    sudo mkdir -p /var/www/sat-hach-trainer
    rsync -av --exclude .git --exclude test --exclude tools \
      ./ user@m710q:/var/www/sat-hach-trainer/

nginx server block tối thiểu:

    server {
        listen 80;
        server_name sat-hach.local;  # đổi theo domain/tailscale hostname thật
        root /var/www/sat-hach-trainer;
        index index.html;
    }
