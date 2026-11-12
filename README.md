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

### Bảng Đường trường (2026-11-12)

Xuất phát và Kết thúc dùng bản ghi chia sẻ với Sa hình. Hai báo lỗi **Xe chết máy**
và **Quá 4000 vòng/phút** dùng lại file báo lỗi hiện có. Ting tong và Tút nằm trong
mục Âm báo mô phỏng.
Chín clip lỗi bổ sung (`generated-errors/duong-truong-*.mp3`) dùng preset Mai Anh
của VieNeu-TTS v3 Turbo 3.8.4, reference codes của preset, tốc độ 80% và đích
−19 LUFS, mono 48 kHz. Câu đọc nằm trong trường `say` của `content/soundboard.json`.
Các câu được dựng riêng bằng preset gốc, tương tự nhóm báo lỗi dùng giọng Mai Anh
thuần trong `docs/audio-error-voice.json`.


### Âm thanh cắt từ video tham chiếu (2026-11-04)

11 hiệu lệnh sa hình và thông báo thi đạt dùng bản ghi trong
`content/audio/recorded/`, cắt từ video do chủ app cung cấp:
https://www.youtube.com/watch?v=koPYGFOVGnY (từ đầu video).
Mốc cắt, nguồn và nội dung đối chiếu nằm trong `docs/audio-recorded-source.json`.
Đây là âm thanh của video tham chiếu, không phải bộ tiếng được xác nhận cho mọi
trung tâm sát hạch; bản gốc có tiếng nền. Chỉ lọc tiếng ù dưới 90 Hz, fade mép rất
ngắn và cân âm lượng khoảng -19 LUFS; không đổi tốc độ hoặc tổng hợp lại giọng.

Xuất phát đọc “Bắt đầu thi”; các bài giữa giữ lời dẫn “Bài thi tiếp theo…”.
Sa hình “Tăng số, tăng tốc độ” đọc tên bài “Thay đổi số trên đường bằng”; phím
Đường trường tăng/giảm số giữ hiệu lệnh TTS riêng. Xuất phát/Kết thúc của Đường
trường dùng chung đoạn bản ghi tương ứng với Sa hình.

Các âm báo Ting tong/Tút/Khẩn cấp giữ bản cũ vì chưa có đoạn tương ứng được xác
minh từ video. Các file TTS trước đây vẫn giữ trên đĩa.
`tools/render-soundboard.sh`, kể cả `--force`, bỏ qua `recorded/` để tránh ghi đè.
APK phải build lại để nhận âm thanh mới.

### Câu báo lỗi mới (2026-11-04)

`content/audio/generated-errors/` chứa 18 câu lỗi/thông báo trượt tổng hợp bằng
VieNeu-TTS v3 Turbo với chất giọng gần mẫu video: dùng giọng rõ Mai Anh làm nền, phối tối đa 15% đặc trưng người nói từ mẫu.
Các nhóm có từ khó dùng giọng nền để ưu tiên phát âm; giữ mã ngữ điệu Mai Anh. Đây không phải
bản nhân giọng giống hoàn toàn. Giọng tham chiếu thuần đọc sai nhiều câu ngắn
trong bước kiểm tra, nên tạo theo nhóm câu rồi cắt riêng. Sau tổng hợp giảm tốc
độ còn 80%, giữ cao độ, thêm khoảng nghỉ đầu/cuối và cân khoảng -19 LUFS.

Theo câu chữ chủ app chốt: “Xe chạm vạch”, “Dừng xe chưa đến vị trí”, “Dừng xe quá
vị trí”, “Bạn đã đi sai quy cách thi”, “Quá thời gian một bài”; bỏ nút “Lên vỉa hè”.
Số và đơn vị được ghi bằng chữ trong `say`; “xi nhan” đọc là “đèn báo rẽ” để rõ
nghĩa và tránh đọc lệch. Câu đường trường tăng/giảm số, các
đoạn bài thi ghi âm và thông báo thi đạt giữ nguyên.

Nguồn, câu đọc, tốc độ và tham số: `docs/audio-error-voice.json`. Tạo lại bằng:

```sh
~/Projects/airi-voice/.venv/bin/python -I tools/render-error-voice.py
```

Sửa đuôi câu: các điểm cắt nằm trong khoảng lặng đo trực tiếp, không dựa vào mốc
chữ nhận dạng. Hai câu bị dính được tổng hợp lại với ngắt đoạn. Thêm 250 ms im
lặng trước khi giảm tốc và 400 ms sau xử lý để giữ nguyên âm cuối; script từ chối
cắt nếu cửa sổ 40 ms quanh điểm cắt còn tiếng nói. FFmpeg `-t` là thời lượng đầu
vào (đặt trước `-i`); giới hạn thời lượng đầu ra sẽ cắt mất phần giọng kéo dài và
khoảng nghỉ. Mỗi bản xuất phải đủ thời lượng sau giảm tốc và có ít nhất 350 ms
đuôi yên lặng trước khi được thay vào app.

Cache của bản này: `sat-hach-trainer-v43`. `render-soundboard.sh --force` cũng
không ghi đè `generated-errors/`; dùng script riêng ở trên.

### Giọng TTS còn lại và lịch sử

`content/audio/` gồm 3 loại:

- **Giọng đọc (từ 2026-11-01): một giọng cho toàn app.** Cả 10 file tên bài sa hình và 22 phím
  giọng trong `content/audio/soundboard/` render lại bằng **VieNeu-TTS v3 Turbo**
  ([pnnbao-ump/VieNeu-TTS-v3-Turbo](https://huggingface.co/pnnbao-ump/VieNeu-TTS-v3-Turbo),
  giấy phép **Apache-2.0**), giọng mẫu **Mai Anh** (nữ, Bắc, kiểu đọc tin tức) do chủ app chọn sau
  khi nghe 8 giọng. Mono 48 kHz, cắt lặng, loudnorm ~-19 LUFS. Chạy lại:
  `tools/render-soundboard.sh --force` (cần venv `~/Projects/airi-voice`). Ghi chú dưới đây là
  lịch sử các giọng cũ.
- **10 file giọng đọc tên bài sa hình** (cũ) theo `audio` trong `content/stations.json` — giọng AI
  48 kHz (thay xong 2026-09-11). **Đây là âm thanh gốc** (chủ app, 2026-10-28): phím Đường trường
  nào trùng nội dung thì dùng lại file sa hình — hiện là Xuất phát và Kết thúc. Ngoại lệ: bài
  sa hình "Tăng số, tăng tốc độ" đang dùng file Đường trường (chủ app đang nghe thử).
- **10 file giọng phím Đường trường** nằm trong `content/audio/soundboard/` — render ngày
  2026-10-27 bằng `tools/render-soundboard.sh`, giọng **piper `vi_VN-vais1000-medium`**
  (22.050 Hz gốc, wrapper `vi-tts` resample về mono 44.1 kHz và loudnorm ~-19 LUFS cho khớp
  các file còn lại). Corpus **VAIS-1000**, giấy phép **CC-BY-4.0** → cần ghi nguồn:
  [VAIS-1000 Vietnamese Speech Synthesis Corpus](https://ieee-dataport.org/documents/vais-1000-vietnamese-speech-synthesis-corpus),
  model từ [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices).

  Trước đó `content/audio/` có **hai họ giọng** mà repo không ghi: 11 file station 48 kHz và
  một đợt soundboard 44.1 kHz làm sau, không rõ engine. Phím kề nhau khác giọng chính là lỗi;
  thư mục `soundboard/` tách hẳn hai consumer. (2026-10-28: Xuất phát và Kết thúc của Đường
  trường dùng lại file sa hình gốc, xem trên.)

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
