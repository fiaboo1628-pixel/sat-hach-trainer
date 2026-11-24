# Đường trường: bàn chấm điểm theo luật, hai bộ luật theo ngày thi

Ngày: 2026-11-24 · Phần 1/5 của đợt "đưa app lên mức phát hành được".

## 1. Mục đích và lý do

Chủ app muốn Sát Hạch Trainer **dùng miễn phí nhưng chuyên nghiệp, đáng tin**, đủ chuẩn để
sau đó mới làm video review/quảng cáo. Trọng tâm là **đường trường**: học viên phải tập
nghiêm túc như thi thật thì mới đạt khi thi.

Người dùng:
- **Thầy dạy lái ngồi ghế phụ** (rành luật, cần bấm nhanh).
- **Người nhà / người đi cùng ngồi ghế phụ** khi không có thầy (không rành luật, cần được dẫn).
- Đường trường **luôn có người khác bấm** (chủ app chốt 2026-11-24): học viên đang lái trên
  đường công cộng không được chạm máy. Không làm chế độ học viên tự bấm cho đường trường.

Hiện tại phần Đường trường (`view-duong-truong`, `content/soundboard.json`) chỉ là bảng phát
âm thanh: bấm lỗi thì đọc tên lỗi, **không trừ điểm, không biết bài nào đang thi, không có kết
quả**. Một vài nhãn lệch văn bản (xem §9).

Luật sắp đổi (nghiên cứu 2026-11-24):
- Đến hết **28/02/2027**: **TT 12/2025/TT-BCA, Phụ lục IV mục C.II** (4 bài, ≥ 2 km). TT 108/2026
  Điều 41 khoản 6 giữ nguyên phần này đến ngày đó.
- Từ **01/3/2027**: **TT 108/2026/TT-BCA, Phụ lục III mục B.4** (12 bài, ≥ 5 km), cộng
  **QCVN 15:2026/BCA §2.3.5** về thiết bị chấm điểm trên đường.
- Nguyên văn đầy đủ, nguồn và các điểm mơ hồ: `docs/research/2026-11-24-tt108-phu-luc-iii.md`
  (TT 108) và §10 của tài liệu này (TT 12, tóm tắt từ nghiên cứu cùng ngày).

## 2. Mục tiêu, không làm, phản mục tiêu

**Mục tiêu**
1. Người ngồi ghế phụ chạy được một buổi thi đường trường **giống thi thật**: ra hiệu lệnh
   từng bài, bấm lỗi, app **đọc tên lỗi và trừ đúng điểm**, tự báo đình chỉ/không đạt, cuối
   buổi có **phiếu kết quả** giống phiếu in trên xe.
2. **Hai bộ luật**, chọn **theo ngày thi dự kiến** (≤ 28/02/2027 → TT 12; từ 01/3/2027 → TT 108),
   đổi tay được.
3. **Mọi lỗi trong app truy được về văn bản**: nhãn nút ngắn, nhưng xem được câu nguyên văn,
   mức trừ và trích dẫn (văn bản, phụ lục, bài).
4. Chỗ văn bản mơ hồ thì app **chọn cách hợp lý nhất và ghi rõ "chưa có hướng dẫn chính thức"**.
5. Dùng được trên xe: chữ to, bấm một tay, màn hình không tắt, chạy offline.

**Không làm trong phần này**
- Sa hình, lý thuyết, build Android (phần 2, 3, 5).
- GPS đo quãng đường/tốc độ (để sau, là tuỳ chọn bổ trợ).
- Tài khoản, máy chủ, đồng bộ, thanh toán (app miễn phí, không thu dữ liệu).
- Chế độ học viên tự bấm cho đường trường.
- Chụp ảnh/camera như thiết bị thật.

**Phản mục tiêu** (làm được mà vẫn là thất bại)
- Có **bất kỳ** mức trừ điểm, tên bài hay tên lỗi **sai văn bản** mà không ghi chú.
- Tự bịa luật cho chỗ văn bản không nói, mà không gắn nhãn "chưa có hướng dẫn chính thức".
- Người nhà không rành luật **không biết bấm gì** khi xe đang chạy (bảng lỗi quá dài, rối).
- Bấm nhầm một lỗi đình chỉ là mất cả buổi tập, không gỡ được.
- Nói hoặc ngụ ý app là phần mềm chấm thi chính thức.

## 3. Ràng buộc

- Giữ kiến trúc hiện có: PWA tĩnh, ES modules, không build step, không thư viện ngoài,
  logic thuần tách khỏi DOM để test bằng `node --test` (xem `CLAUDE.md`).
- Mỗi lần đổi file phát hành phải tăng `CACHE_NAME` trong `service-worker.js`; module JS mới
  thêm vào `APP_SHELL`.
- Giao diện theo hướng chủ app đã chốt 2026-11-01 (kem ấm pastel, phím trắng nổi 3D, màu
  xanh/vàng/đỏ của đèn xe sát hạch); đọc `.impeccable/` trước khi đổi giao diện.
- Âm thanh: **một giọng cho mọi câu nói** (VieNeu-TTS v3 Turbo, preset Mai Anh, `tools/`).
  **Máy hiện tại chưa có môi trường `~/Projects/airi-voice`**, nên phải dựng lại trước khi
  render câu mới. Không ghi đè `content/audio/recorded/` và `generated-errors/` đang dùng
  (quy tắc trong `CLAUDE.md`).
- App miễn phí, không thu thập dữ liệu; lưu cục bộ bằng `localStorage`.

## 4. Các cách làm đã cân nhắc

| | Cách | Được | Mất |
|---|---|---|---|
| **A ✅** | **Luật là dữ liệu** (mỗi bộ luật một file JSON) + **bộ chấm điểm thuần JS** dùng chung + một bàn chấm điểm đọc dữ liệu | Đổi luật chỉ sửa dữ liệu; mỗi lỗi mang sẵn trích dẫn; test được từng mức trừ; sa hình (phần 2) dùng lại bộ chấm | Lần đầu tốn công hơn |
| B | Viết riêng từng màn hình cho từng bộ luật | Nhanh lúc đầu | Lặp code ×2 (×4 khi thêm sa hình), dễ lệch, khó test → trái mục tiêu "chính xác" |
| C | A + GPS tự đo quãng đường, tốc độ | Nhắc 5 km, gợi ý lỗi tốc độ | Sai số GPS, xin quyền vị trí; để sau như tuỳ chọn |

**Chủ app chọn A** (2026-11-24). C để dành.

## 5. Thiết kế

### 5.1 Luồng người dùng

1. **Menu → Đường trường → màn Chuẩn bị buổi thi**
   - Ngày thi dự kiến (mặc định hôm nay) → hiện bộ luật áp dụng, ví dụ
     "Áp dụng TT 12/2025/TT-BCA (đến 28/02/2027)". Có nút đổi bộ luật bằng tay.
   - Hạng: B / C1. Hộp số: số sàn / số tự động (gồm xe điện).
   - Nút **Bắt đầu buổi thi**. Liên kết "Xem quy định đường trường" (trang hướng dẫn, §5.5).
2. **Bàn chấm điểm** (giữ màn hình sáng bằng Wake Lock như hiện nay). Từ trên xuống:
   - **Thanh trạng thái** luôn thấy: điểm còn lại (to), trạng thái (Đang thi / Không đạt /
     Đình chỉ), bài đang thi, đồng hồ buổi thi.
   - **Hiệu lệnh** (xanh): nút ra lệnh bài. Bấm → đọc câu hiệu lệnh, đặt "bài đang thi".
   - **Lỗi của bài đang thi** (đỏ) + **lỗi chung** (đỏ đậm cho lỗi đình chỉ), mỗi nút ghi
     mức trừ (−5 / −10 / Đình chỉ).
   - **Hoàn tác** lỗi vừa bấm (luôn có, hiện tên lỗi sẽ gỡ).
   - **Kết thúc buổi**.
3. **Phiếu kết quả** (không có ảnh phiếu thật; builder thiết kế theo các mục của Mẫu số 03
   TT 108: thông tin thí sinh/hạng, tổng quãng đường nếu có, lỗi theo bài kèm thời điểm, tổng
   điểm, kết quả): điểm cuối, ĐẠT/KHÔNG ĐẠT, danh sách lỗi theo bài kèm thời điểm, bộ luật
   và trích dẫn từng lỗi, ngày giờ, hạng, hộp số. Lưu vào lịch sử trên máy.

### 5.2 Hiệu lệnh theo bộ luật

**TT 12** (C.II.2.2.1): Xuất phát → (Tăng số, tăng tốc độ / Giảm số, giảm tốc độ: nhiều lần,
không theo thứ tự) → Kết thúc. Đủ 4 bài là tối thiểu; app không ép số lần.

**TT 108** (PL III B.4.4): Bài 1 "Kiểm tra an toàn xe và xuất phát" luôn đầu tiên; Bài 12
"Mở cửa xe và kết thúc" luôn cuối; Bài 2–11 bấm theo bất kỳ thứ tự nào, lặp được; Bài 3 và 11
là bài có điều kiện, có thể không có.
- Bài 1 có **bước kiểm tra trước khi lên xe**: bàn hiện các lỗi kiểm tra an toàn (không kiểm
  tra xung quanh xe, không kiểm tra đèn còi phanh lái gạt mưa gương, tư thế ngồi) trước khi
  bấm lệnh Xuất phát.
- Nhắc quãng đường: khi bấm "Kết thúc" mà chưa xác nhận đủ quãng đường, app hỏi
  "Luật mới yêu cầu tối thiểu 5 km. Đã đủ chưa?" (không có GPS ở phần này).

Trước lệnh Xuất phát chỉ cho bấm lệnh Xuất phát (và các lỗi chuẩn bị của Bài 1 ở TT 108).
Sau Kết thúc buổi thi khoá, chỉ còn xem phiếu.

### 5.3 Bộ chấm điểm (quy tắc)

- Bắt đầu **100 điểm**, đạt khi **≥ 80** (TT 12 C.II.3; TT 108 PL III B.4.6).
- Bấm lỗi → trừ đúng mức của lỗi đó, ghi lại (bài, thời điểm, lỗi), **đọc tên lỗi**
  (như loa xe thật, QCVN 15 §2.3.5.2.9).
- Lỗi "mỗi lần" thì bấm bao nhiêu lần trừ bấy nhiêu. Lỗi "cứ 03 giây trừ 02 điểm" (TT 12, số 3
  dưới 20 km/h) là một nút trừ 2 điểm, bấm lặp theo thời gian vi phạm.
- *(Quyết định của Claude, văn bản không nói rõ)* Lỗi **không** có "mỗi lần" chỉ trừ **một lần
  trong mỗi lượt bài** (mỗi lần bấm hiệu lệnh một bài là một lượt mới; lặp Bài 2–11 thì trừ lại
  được ở lượt sau). Bấm lần hai trong cùng lượt: không trừ thêm, nút hiện "đã ghi". Lỗi chung
  của TT 12 tính theo lượt của bài đang thi. Ghi nhãn "chưa có hướng dẫn chính thức".
- **Lỗi đình chỉ** → buổi thi chuyển sang **Đình chỉ** ngay, đọc thông báo, mở phiếu.
- **Dưới 80 điểm** → chuyển **Không đạt**, đọc thông báo. Văn bản đường trường **không ghi rõ**
  phải dừng ngay (khác sa hình), nên app **cho chọn**: "Dừng và xem phiếu" hoặc "Tập tiếp"
  (kết quả vẫn là Không đạt). Ghi nhãn "chưa có hướng dẫn chính thức".
- **Hẹn giờ 30 giây sau lệnh Xuất phát** (cả hai bộ luật): đếm ngược hiện to, nút
  **"Xe đã qua vạch xuất phát"** dừng đồng hồ; hết 30 giây chưa bấm → tự đình chỉ, như máy thật.
- **Hoàn tác**: gỡ lỗi gần nhất (kể cả lỗi đình chỉ, khôi phục trạng thái trước đó). Phiếu
  không ghi lỗi đã gỡ.
- Hộp số tự động: nhãn bài Kết thúc TT 12 đổi "về số không" thành "về số P"; lỗi về tay số
  của TT 12 (15 m lên số 3, tăng/giảm số trong 100 m, số 3 dưới 20 km/h) và "Tay số không phù
  hợp" của TT 108 vẫn hiện nhưng có ghi chú "Văn bản viết cho xe số sàn; chưa có hướng dẫn
  chính thức cho xe số tự động".

### 5.4 Ai bắt lỗi: máy hay sát hạch viên

Trên xe thật, một số lỗi **máy tự bắt** (QCVN 15 §2.3.5.2.3: dây an toàn, xi nhan, chết máy,
phanh đỗ, 15 m không tăng số, tay số không phù hợp, không giảm hết số), số còn lại **sát hạch
viên bấm** (§2.3.5.2.4). Trong app **người ngồi ghế phụ bấm tất cả**, nhưng mỗi lỗi mang nhãn
nguồn bắt lỗi để người tập biết "lỗi này máy thật tự bắt, không qua mắt được". Lỗi không có
trong cả hai danh sách của QCVN được gắn "sát hạch viên (suy luận)" như trong tài liệu nghiên
cứu.

### 5.4b Một bàn cho cả thầy và người nhà

*(Quyết định của Claude)* Không làm chế độ riêng. Một bàn duy nhất, dẫn người không rành bằng
cách sắp xếp:
- Chỉ hiện lỗi của **bài đang thi** + lỗi chung; bài khác ẩn.
- Trong mỗi bài, xếp **lỗi máy thật tự bắt lên trước** (dễ nhận ra: dây an toàn, xi nhan, chết
  máy…), rồi lỗi sát hạch viên bấm, lỗi đình chỉ để riêng cuối, màu đậm.
- Mỗi bài có **một dòng "cần để ý"** bằng lời thường (ví dụ Bài 4: "Xi nhan trái, giảm tốc, nhìn
  gương, nhường người đi bộ") lấy từ cột "Yêu cầu đạt được".
- Kiểm thử 375 px: thấy được điểm, hiệu lệnh và ít nhất các lỗi máy tự bắt của bài đang thi
  mà không cần cuộn; phần còn lại cuộn được.

### 5.5 Dữ liệu luật

Mỗi bộ luật một file trong `content/rules/` (tên file do builder đặt), gồm:
- Định danh, tên văn bản, ngày hiệu lực từ/đến, điểm khởi đầu, điểm đạt, quãng đường tối thiểu.
- **Bài**: id, tên chính thức (nguyên văn), nhãn ngắn trên nút, vị trí (đầu/cuối/tự do), lặp
  được không, có điều kiện không, file âm thanh hiệu lệnh, danh sách lỗi thuộc bài, trích dẫn.
- **Lỗi**: id, nhãn ngắn, **câu nguyên văn**, mức trừ (số điểm hoặc đình chỉ), "mỗi lần" hay
  không, nguồn bắt lỗi (máy / sát hạch viên / sát hạch viên suy luận), trích dẫn, file âm thanh,
  câu đọc (`say`), ghi chú mơ hồ nếu có.
- **Lỗi chung** áp dụng mọi bài (TT 12: rung giật, chết máy, 4000 vòng/phút, số 3 dưới
  20 km/h, vi phạm quy tắc giao thông −10, không theo hiệu lệnh, gây tai nạn, choạng lái).
  TT 108 lặp lỗi trong từng bài; builder quyết định gom thành lỗi chung hay để theo bài, miễn
  là mức trừ hiển thị đúng bài đang thi (ví dụ chết máy Bài 4 không có "mỗi lần").

Trang **"Quy định thi đường trường"** (thay `view-huong-dan-dt`) **sinh từ cùng dữ liệu này**,
có hai thẻ TT 12 / TT 108, nên hướng dẫn và bàn chấm điểm không bao giờ lệch nhau.

**Bỏ hẳn bảng 12 phím đường trường cũ**, gồm cả Ting tong và Tút ở đường trường (chủ app đồng
ý 2026-11-24; hai âm này chỉ có ở sa hình). `content/soundboard.json` không còn dùng; file âm
thanh trùng câu được dùng lại. Cập nhật `CLAUDE.md` (đoạn "The in-car board stays at its 12
keys") cho khớp quyết định mới.

### 5.6 Âm thanh

- Câu hiệu lệnh cho 12 bài TT 108, câu đọc mọi lỗi mới, thông báo "Bạn bị đình chỉ sát hạch",
  "Bạn không đạt", "Bạn đã hoàn thành bài thi với … điểm" (đọc số điểm: builder chọn cách,
  ví dụ ghép câu).
- Dùng lại file hiện có khi câu đọc trùng nghĩa và đúng chữ.
- Cùng giọng Mai Anh, cùng xử lý (tốc độ, −19 LUFS, đuôi lặng) như `docs/audio-error-voice.json`.
- **Âm thanh đủ là điều kiện phát hành phần 1** (chủ app chọn 2026-11-24): mọi hiệu lệnh, lỗi
  và thông báo của cả hai bộ luật phải có file trước khi deploy. Dựng lại môi trường
  `~/Projects/airi-voice` là một bước trong kế hoạch.
- *(Quyết định của Claude)* Kiểm tra từng câu bằng nhận dạng giọng nói (so chữ đọc ra với
  `say`) và đo thời lượng/đuôi lặng như quy tắc trong `CLAUDE.md`; câu nào lệch thì tạo lại.
  Sau đó gửi chủ app **một bản nghe thử gộp** để duyệt lần cuối trước khi phát hành.
- Thiếu file âm thanh vẫn không được làm hỏng buổi thi (phòng khi file lỗi): vẫn trừ điểm, hiện
  chữ to thay tiếng. Test dữ liệu bắt buộc mọi file tồn tại.

### 5.7 Chuyên nghiệp và tin cậy

- Mỗi nút lỗi mở được **thông tin**: câu nguyên văn, mức trừ, trích dẫn, ghi chú mơ hồ.
  Không làm người bấm chậm: thông tin là thao tác phụ, bấm chính vẫn là trừ điểm.
- Trang **Giới thiệu**: app làm theo văn bản nào, cập nhật ngày nào, liên hệ góp ý (dùng lại
  liên kết Zalo và Gmail đang có ở trang chủ), câu miễn
  trừ ("công cụ tập luyện, không phải phần mềm chấm thi chính thức"), "không thu thập dữ liệu".
- Hỏi xác nhận khi rời bàn chấm điểm giữa buổi.
- Lịch sử buổi thi lưu trên máy, xoá được.

### 5.8 Kiểm thử

- Test dữ liệu: id không trùng, mức trừ chỉ là 2/5/10/đình chỉ, mọi lỗi có trích dẫn và câu
  nguyên văn, mọi file âm thanh tồn tại, bài đầu/cuối đúng, ngày hiệu lực hai bộ không chồng.
- Test bộ chấm: trừ điểm, "mỗi lần", ngưỡng 80, đình chỉ, hoàn tác (cả đình chỉ), hẹn giờ 30 s,
  chọn bộ luật theo ngày (28/02/2027 → TT 12; 01/03/2027 → TT 108), khoá sau kết thúc.
- **Bảng đối chiếu** mức trừ từng lỗi với tài liệu nghiên cứu: kiểm tra tay một lượt, ghi kết
  quả vào work log.
- Thử trên điện thoại cỡ 375 px: bàn chấm điểm không cần cuộn để thấy điểm, hiệu lệnh và lỗi
  hay gặp nhất.

## 6. Chủ app đã quyết

- Đối tượng: thầy ngồi ghế phụ hoặc người đi cùng; đường trường luôn có người khác bấm.
- Hai bộ luật, chọn theo ngày thi.
- Miễn phí, không tài khoản, không máy chủ; phải chuyên nghiệp, có nguồn.
- Thứ tự 5 phần; cách A cho phần này.
- Bỏ bảng 12 phím đường trường cũ, kể cả Ting tong/Tút ở đường trường.
- Âm thanh đầy đủ trước khi phát hành phần 1.
- Không có ảnh phiếu thật; tự thiết kế phiếu theo Mẫu số 03.

## 7. Phần để builder quyết

Bố cục chính xác của bàn chấm điểm, tên file và cấu trúc JSON cụ thể, cách gom lỗi lặp của
TT 108, cách đọc số điểm bằng âm thanh, lưu lịch sử bao nhiêu buổi, chia nhỏ module JS.

## 8. Rủi ro

- Môi trường TTS chưa có trên máy mới → dựng lại tốn thời gian; câu mới có thể đọc sai dấu,
  phải nghe kiểm từng câu.
- Văn bản TT 108 chỉ đọc được qua bản chép LuatVietnam; khi có bản Công báo/vbpl cần đối chiếu
  lại. Bản sao văn bản gốc đã lưu trong `docs/research/nguon/` (TT 12, TT 108, QCVN 15:2026).
- Cục CSGT có thể ra hướng dẫn trước 01/3/2027 làm đổi các điểm "chưa có hướng dẫn".

## 9. Nhãn hiện có lệch văn bản (TT 12) cần sửa khi chuyển sang dữ liệu mới

- "Không hạ thắng tay" → "Không nhả hết phanh tay khi khởi hành".
- "Không tăng số" / "Không giảm số" → "Trong khoảng 100 m không tăng/giảm được số, tốc độ".
- "Không bật xi nhan" → tách "xi nhan trái khi xuất phát" và "xi nhan phải" khi kết thúc.
- "Vào số sai" không có trong văn bản → bỏ.
- Thiếu "Trong khoảng 15 m không tăng từ số 1 lên số 3".
- Trang hướng dẫn ghi "Loa trên xe ra lệnh từng bài" → sát hạch viên bấm nút ra lệnh.

## 10. TT 12/2025 Phụ lục IV C.II: tóm tắt để dựng dữ liệu

(Nguồn: PDF phụ lục TT 12/2025 do cddl.edu.vn đăng lại, tr. 17–22; cần đối chiếu nguyên văn
khi dựng dữ liệu.)
- Sát hạch viên ngồi cạnh, ra hiệu lệnh bằng phím, bảo hiểm tay lái. Đường ≥ 2 km, ≥ 4 bài.
- **Xuất phát**: Không thắt dây an toàn −5; Không bật đèn xi nhan trái khi xuất phát −5; Không
  nhả hết phanh tay khi khởi hành −5; Trong khoảng 15 m không tăng từ số 1 lên số 3 −5; Quá 30
  giây kể từ khi có lệnh xuất phát chưa khởi hành xe qua vị trí xuất phát → đình chỉ.
- **Tăng số, tăng tốc độ**: Trong khoảng 100 m không tăng được số, tốc độ −5.
- **Giảm số, giảm tốc độ**: Trong khoảng 100 m không giảm được số, tốc độ −5.
- **Kết thúc**: Không bật đèn xi nhan phải −5; Khi xe dừng hẳn không về được số "không" (số
  sàn) / "P" (tự động, gồm xe điện) −5; Không kéo phanh tay khi xe dừng hẳn −5.
- **Mọi bài**: Xe bị rung giật mạnh −5; Lái xe bị chết máy, mỗi lần −5; Để tốc độ động cơ quá
  4000 vòng/phút, mỗi lần −5; Sử dụng từ tay số 3 trở lên khi tốc độ dưới 20 km/h, cứ 03 giây
  −2; Vi phạm quy tắc giao thông đường bộ −10; Không thực hiện theo hiệu lệnh của sát hạch viên
  → đình chỉ; Xử lý tình huống không hợp lý gây tai nạn → đình chỉ; Khi tăng hoặc giảm số, xe bị
  choạng lái quá làn đường quy định → đình chỉ.
