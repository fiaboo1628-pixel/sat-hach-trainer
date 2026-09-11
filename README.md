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

## Audio

`content/audio/*.mp3` gồm 2 loại:

- **11 file giọng đọc theo `audio` trong `content/stations.json`** — audio thật (giọng
  AI, thay xong 2026-09-11), không còn placeholder.
- **`ting-tong.mp3`** (field `cue`, tự động phát trước giọng đọc mỗi khi vào bài) —
  hiện vẫn là placeholder (chime 2 nốt tổng hợp bằng `tools/gen-placeholder-audio.sh`).
  Thay bằng bản ghi thật: đè file `content/audio/ting-tong.mp3`, rồi tăng số version
  `CACHE_NAME` trong `service-worker.js` để trình duyệt tải bản mới.
- **"Tút" báo lỗi**: chưa làm — cần audio thật + quyết định UI (nút bấm tay) trước, xem
  `docs/superpowers/specs/2026-09-02-audio-sa-hinh-mvp-design.md`.

## Bộ câu hỏi lý thuyết (600 câu thật, đã thay xong 2026-09-07)

`content/theory/questions.json` nay là 600 câu thật (không còn placeholder), lấy từ
PDF gốc Cục CSGT (`600 CÂU HỎI DÙNG CHO SÁT HẠCH LÁI XE CƠ GIỚI ĐƯỜNG BỘ`, Hà Nội
2025). Nguồn:

- **Câu hỏi + đáp án đúng**: PDF gạch chân đáp án đúng thay vì liệt kê riêng, không
  `pdftotext`/`pdftohtml` nào giữ được format gạch chân (đã thử, xem lịch sử). Giải
  quyết bằng cách đọc vector content-stream của PDF (`mutool trace`, từ gói `mupdf`)
  để lấy toạ độ từng glyph + từng hình chữ nhật tô đen mỏng (chính là nét gạch chân),
  rồi khớp toạ độ để suy ra đáp án đúng cho từng câu. Đã verify bằng cách so ảnh
  render PDF thật (`pdftoppm`) với kết quả script cho nhiều câu rải rác — khớp 100%.
- **Ảnh biển báo/sa hình** (`content/theory/images/*.jpg`, 316 câu có ảnh): thay vì
  trích ảnh JPEG nhúng trong PDF (sẽ thiếu các mũi tên/overlay vector vẽ đè lên ảnh ở
  nhiều câu sa hình chương VI), script render nguyên trang ở 200dpi rồi crop đúng dải
  toạ độ giữa phần đề bài và đáp án đầu tiên — giữ đủ overlay. Nén JPEG q82 + resize
  max 900px sau khi crop (bản gốc PNG 92MB → 11MB).
- **`is_liet` (60 câu điểm liệt)**: PDF gốc không liệt kê số câu cụ thể, chỉ nói có
  60 câu. Danh sách chính thức lấy từ **Phụ lục 3, Công văn 2262/CSGT-P5 ngày
  07/5/2025** (Cục CSGT — văn bản hướng dẫn dùng bộ 600 câu này), tải trực tiếp PDF
  văn bản tại `cdn.thuvienphapluat.vn` — không lấy từ các bài blog tổng hợp thứ cấp
  (đã thử vài nguồn, hầu hết là danh sách cũ của bộ 450/600 câu trước, chữ không khớp
  bộ câu hỏi 2025 khi đối chiếu — chỉ khớp ~50%). Danh sách 60 số câu này được gán
  `chapter: "tinh-huong-atgt"` (ghi đè chapter gốc trong PDF, đúng thiết kế hiện có
  của `generateExam`/`validateLietChapterConsistency`).

Script trích xuất không nằm trong repo (chạy 1 lần, không cần chạy lại trừ khi có bộ
đề mới) — xem memory `sat-hach-600-cau-pdf` nếu cần dựng lại.

Khi cần thay bằng bộ đề khác/mới hơn, giữ đúng shape hiện có (`id` `q001`–`q600`,
`text`, `choices`, `answer`, `is_liet`, `chapter`, `image`); `chapter` là 1 trong 7
slug mà `generateExam` dùng (`quy-tac`, `tinh-huong-atgt`, `van-hoa`, `ky-thuat`,
`cau-tao`, `bao-hieu`, `xu-ly-tinh-huong`); `is_liet: true` phải luôn đi cùng
`chapter: "tinh-huong-atgt"` và ngược lại; nhớ tăng version `CACHE_NAME` trong
`service-worker.js` và chạy `node --test test/` (bắt id trùng, answer sai chỉ số,
is_liet-chapter lệch nhau, thiếu câu 1 nhóm cho hạng B/C1, đúng 60 câu điểm liệt).

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
