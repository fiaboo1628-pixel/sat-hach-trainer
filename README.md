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

`content/audio/` gồm 3 loại:

- **9 file giọng đọc tên bài sa hình** theo `audio` trong `content/stations.json` — giọng AI
  48 kHz (thay xong 2026-09-11). Hai bài trùng nội dung với phím Đường trường (Xuất phát;
  Tăng số, tăng tốc độ) dùng thẳng file piper của Đường trường từ 2026-10-28 — chủ app lấy
  giọng Đường trường làm chuẩn; Kết thúc thì ngược lại, Đường trường dùng file của sa hình.
- **10 file giọng phím Đường trường** nằm trong `content/audio/soundboard/` — render ngày
  2026-10-27 bằng `tools/render-soundboard.sh`, giọng **piper `vi_VN-vais1000-medium`**
  (22.050 Hz gốc, wrapper `vi-tts` resample về mono 44.1 kHz và loudnorm ~-19 LUFS cho khớp
  các file còn lại). Corpus **VAIS-1000**, giấy phép **CC-BY-4.0** → cần ghi nguồn:
  [VAIS-1000 Vietnamese Speech Synthesis Corpus](https://ieee-dataport.org/documents/vais-1000-vietnamese-speech-synthesis-corpus),
  model từ [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices).

  Trước đó `content/audio/` có **hai họ giọng** mà repo không ghi: 11 file station 48 kHz và
  một đợt soundboard 44.1 kHz làm sau, không rõ engine. Phím kề nhau khác giọng chính là lỗi;
  thư mục `soundboard/` tách hẳn hai consumer. (2026-10-28: chủ app chọn cho hai bài sa hình
  trùng nội dung dùng lại file Đường trường, xem trên.)

  Đổi nhãn phím trong `content/soundboard.json` rồi chạy lại script (`--force` để render đè),
  sau đó **tăng `CACHE_NAME`**. `ting-tong.mp3` và `tut.mp3` không bị script chạm — đó là
  tiếng máy phát, không phải lời đọc.

- **12 file giọng phím lỗi sa hình** trong `content/audio/soundboard/` (đè vạch, dừng chưa đến/quá vạch, quá thời gian bài, chết máy…) — render 2026-10-28 cùng giọng piper ở trên, danh sách trong `content/sa-hinh-loi.json`. Hai phím "Không bật xi nhan" và "Không thắt dây an toàn" dùng chung file với Đường trường. Danh sách lỗi và mức trừ điểm theo quy trình sát hạch hạng B trong hình ([LuatVietnam tóm tắt Thông tư 35/2024/TT-BGTVT, Phụ lục XV mục C](https://luatvietnam.vn/giao-thong/tru-diem-khi-thi-thuc-hanh-bang-lai-o-to-863-100553-article.html); tụt dốc quá 50 cm là truất quyền).

- Trang **Hướng dẫn thi đường trường** (chỉ chữ, không audio) lấy theo quy trình sát hạch trên đường hạng B, mục 2.2.2 ([bản trích Phụ lục, thuvienphapluat](https://cdn.thuvienphapluat.vn/uploads/danluatfile/2024/06/10/Phan-C-2.docx)); mức đậu 80/100.

- **`khan-cap.mp3`** (phím Khẩn cấp của bảng sa hình, tình huống nguy hiểm): còi hú tự tổng hợp bằng ffmpeg, không phải bản ghi thật -- quét 650→1200 Hz mỗi 0,5 s trong 3 s:

      ffmpeg -f lavfi -i "aevalsrc='0.3*sin(2*PI*(650*mod(t\,0.5)+550*mod(t\,0.5)^2)) + 0.08*sin(4*PI*(650*mod(t\,0.5)+550*mod(t\,0.5)^2))':s=44100:d=3" \
        -af "afade=t=in:d=0.02,afade=t=out:st=2.8:d=0.2" -ac 1 -codec:a libmp3lame -q:a 4 khan-cap.mp3

  Có bản ghi tiếng thật ở sân thi thì đè file này rồi tăng `CACHE_NAME`.

- **`ting-tong.mp3`** (field `cue`, tín hiệu nhận bài phát sau tên bài) — bản ghi thật
  tiếng chuông cửa "ding-dong" (thay xong 2026-10-02): [Doorbell #6, BigSoundBank](https://bigsoundbank.com/doorbell-6-s2365.html),
  tác giả Dorian Clair, giấy phép **CC0** (không cần ghi nguồn). Đã xử lý từ file WAV gốc:

      ffmpeg -i doorbell-6.wav -af "atrim=0:1.8,afade=t=in:d=0.005,afade=t=out:st=1.0:d=0.8,volume=-1.5dB" \
        -ac 1 -ar 44100 -map_metadata -1 -codec:a libmp3lame -q:a 4 ting-tong.mp3

  (cắt còn 1,8s, fade đuôi, âm lượng ~-20 LUFS cho khớp giọng đọc ~-19 LUFS). Muốn thay
  bản khác: đè file `content/audio/ting-tong.mp3`, rồi tăng số version `CACHE_NAME` trong
  `service-worker.js` để trình duyệt tải bản mới.
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

## Deploy: Vercel (đang dùng, từ 2026-10-28)

https://sat-hach-trainer.vercel.app — repo GitHub đã chuyển sang riêng tư nên GitHub Pages tắt.
Đưa bản mới lên: `vercel deploy --prod` trong thư mục repo (CLI ở `~/.local/bin/vercel`, đã đăng
nhập; `.vercelignore` bỏ test/tools/docs). Nếu đã cài ứng dụng Vercel trên GitHub và chạy
`vercel git connect` thì push `main` là tự deploy. Nhớ tăng `CACHE_NAME` để máy đã cài nhận bản
mới. Bản Android build riêng ở `../sat-hach-trainer-android`.

## Deploy lên M710q (nginx, tự host) (cách cũ, không còn dùng)

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
