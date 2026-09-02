# Sát Hạch Trainer — MVP: Module âm thanh sa hình

Status: đã duyệt hướng, chờ nội dung audio thật trước khi implement.

## Bối cảnh & mục tiêu

User là giáo viên dạy lái xe hạng B/C1. Sản phẩm dài hạn gồm 2 phần: (1) âm thanh mô
phỏng hiệu lệnh sa hình — free, phân phối qua giáo viên khác dùng khi dạy thực hành ở
sân không có loa/cảm biến thật; (2) bộ đề luyện thi lý thuyết — thu phí, làm sau.

Spec này chỉ phủ **phần (1) — module âm thanh sa hình**, phạm vi MVP.

Ưu tiên: riêng tư (không cần tài khoản/đăng nhập/personal branding), chạy được ở sân
tập không có mạng, chi phí vận hành gần bằng 0.

## Phạm vi MVP

Trong phạm vi:
- Phát lại tuần tự các hiệu lệnh/tín hiệu âm thanh của bài thi sa hình, theo 1 trong 2
  bộ: **Bộ chuẩn** hoặc **Bộ tự ghép**.
- Chạy offline sau lần tải đầu (cài như app qua PWA).

Ngoài phạm vi (để sau, không làm ở bản này):
- Tài khoản, đăng nhập, đồng bộ nhiều thiết bị.
- Thanh toán/paywall dưới mọi hình thức.
- Nhiều bộ tự ghép có đặt tên (chỉ 1 bộ, không tên, lưu đè).
- Module đề lý thuyết.

## Nội dung: 13 bài của Bộ chuẩn

Xác nhận với user (không phải nguồn web — nguồn công khai tìm được sai/thiếu), đúng
thực tế sân sát hạch của user, thứ tự cố định:

1. Xuất phát
2. Dừng xe nhường đường người đi bộ
3. Dừng xe, đề-pa lên dốc
4. Qua hàng đinh vuông góc (chữ Z)
5. Qua ngã tư có tín hiệu đèn giao thông
6. Qua đường vòng quanh co (chữ S)
7. Qua ngã tư có tín hiệu đèn giao thông (lần 2)
8. Ghép xe dọc
9. Qua ngã tư có tín hiệu đèn giao thông (lần 3)
10. Dừng xe nơi giao nhau đường sắt
11. Tăng tốc, tăng số
12. Ghép xe ngang (đỗ song song)
13. Kết thúc

Ghi chú quan trọng: "Qua ngã tư có tín hiệu đèn giao thông" là **1 loại bài (1 file
audio)** nhưng xuất hiện 3 lần ở các vị trí khác nhau trong bộ chuẩn — vì sân có nhiều
điểm giao cắt đèn tín hiệu trên đường di chuyển thực tế. Data model phải cho phép 1
loại bài xuất hiện nhiều lần trong 1 bộ (xem Data model bên dưới).

**Nội dung âm thanh thật (text để TTS đọc, và các tín hiệu phi lời nói như "ting tong"
lúc vào bài, "tút" báo lỗi, tín hiệu kết thúc...) không có nguồn công khai đáng tin —
user (giáo viên, đã nghe hệ thống DAT thật nhiều lần) sẽ cung cấp riêng.** Đây là một
bước content-authoring độc lập, không chặn việc viết code — code chạy được với nội
dung placeholder trước, thay bằng nội dung thật khi có.

## Kiến trúc

```
[content/stations.json]      <- danh sách loại bài + text hiệu lệnh + tên file audio
[content/audio/*.mp3]        <- audio TTS sinh 1 lần (build-time), + tín hiệu tút/ting-tong
        |
        v
[index.html + app.js + style.css]   <- PWA tĩnh, vanilla JS, không build step, không framework
        |
        v
[service-worker.js]          <- cache toàn bộ HTML/JS/CSS/audio để chạy offline
        |
        v
   localStorage               <- lưu bộ tự ghép (mảng station id, có thể lặp)
```

Không backend, không database, không server-side logic. Toàn bộ là static files.
Host: nginx serve thư mục static trên M710q (giống các service khác đang chạy ở đó).

**Vì sao không dùng framework/TTS runtime (đã chốt ở bước brainstorm, nhắc lại ngắn
gọn để spec tự đủ):** nội dung hiệu lệnh cố định, không đổi theo user → sinh TTS 1 lần
lúc build nội dung là đủ, không cần TTS chạy trong trình duyệt (rủi ro chất lượng
giọng Việt không đồng đều giữa các máy). Không cần framework vì toàn bộ logic chỉ là
"chọn danh sách station theo thứ tự rồi phát tuần tự" — vanilla JS đủ, không có state
phức tạp.

## Data model

`content/stations.json` — danh sách loại bài (không đổi giữa 2 bộ):

```json
[
  { "id": "xuat-phat", "name": "Xuất phát", "audio": "xuat-phat.mp3" },
  { "id": "nhuong-nguoi-di-bo", "name": "Dừng xe nhường đường người đi bộ", "audio": "nhuong-nguoi-di-bo.mp3" },
  { "id": "de-pa-len-doc", "name": "Dừng xe, đề-pa lên dốc", "audio": "de-pa-len-doc.mp3" },
  { "id": "hang-dinh-vuong-goc", "name": "Qua hàng đinh vuông góc (chữ Z)", "audio": "hang-dinh-vuong-goc.mp3" },
  { "id": "nga-tu-den-tin-hieu", "name": "Qua ngã tư có tín hiệu đèn giao thông", "audio": "nga-tu-den-tin-hieu.mp3" },
  { "id": "duong-vong-quanh-co", "name": "Qua đường vòng quanh co (chữ S)", "audio": "duong-vong-quanh-co.mp3" },
  { "id": "ghep-xe-doc", "name": "Ghép xe dọc", "audio": "ghep-xe-doc.mp3" },
  { "id": "giao-duong-sat", "name": "Dừng xe nơi giao nhau đường sắt", "audio": "giao-duong-sat.mp3" },
  { "id": "tang-toc-tang-so", "name": "Tăng tốc, tăng số", "audio": "tang-toc-tang-so.mp3" },
  { "id": "ghep-xe-ngang", "name": "Ghép xe ngang (đỗ song song)", "audio": "ghep-xe-ngang.mp3" },
  { "id": "ket-thuc", "name": "Kết thúc", "audio": "ket-thuc.mp3" }
]
```

`content/standard-set.json` — Bộ chuẩn, chỉ là mảng id theo đúng thứ tự 13 bài (lặp
id `nga-tu-den-tin-hieu` 3 lần):

```json
["xuat-phat", "nhuong-nguoi-di-bo", "de-pa-len-doc", "hang-dinh-vuong-goc",
 "nga-tu-den-tin-hieu", "duong-vong-quanh-co", "nga-tu-den-tin-hieu",
 "ghep-xe-doc", "nga-tu-den-tin-hieu", "giao-duong-sat", "tang-toc-tang-so",
 "ghep-xe-ngang", "ket-thuc"]
```

`localStorage["bo-tu-ghep"]` — mảng id do người dùng chọn, thứ tự tuỳ ý, lặp tuỳ ý,
cùng format với `standard-set.json`. Ghi đè mỗi lần người dùng lưu lại.

Tín hiệu phi-lời-nói (ting tong / tút / âm kết thúc): thêm field tuỳ chọn vào từng
station khi có nội dung thật, ví dụ `"cue": "ting-tong.mp3"` phát trước
`audio`, và một `error-tut.mp3` dùng chung (không gắn theo station cụ thể). Vì chưa
có nội dung thật, để trống lúc code, thêm khi có.

## Luồng chính (component)

- **Màn hình chọn bộ**: 2 nút — "Bộ chuẩn" / "Bộ tự ghép".
- **Bộ chuẩn**: đọc `standard-set.json`, hiện danh sách 13 bài theo thứ tự cố định,
  nút Play chạy tuần tự (đợi hết audio 1 bài mới sang bài kế, có thể có độ trễ cấu
  hình riêng cho các bài cần giữ trạng thái như "dừng xe" — TBD khi có nội dung thật).
- **Bộ tự ghép**: hiện danh sách 11 loại bài (từ `stations.json`) dạng có thể bấm thêm
  nhiều lần vào 1 danh sách đang xây (cho phép trùng), kéo-thả hoặc nút lên/xuống để
  sắp xếp, nút Lưu ghi vào `localStorage` (đè bộ cũ), nút Play chạy tuần tự y hệt Bộ
  chuẩn. Mở lại app tự load bộ đã lưu gần nhất.
- **Service worker**: cache-first cho toàn bộ asset tĩnh (HTML/CSS/JS/JSON/audio),
  đăng ký ở lần load đầu tiên (cần mạng), sau đó offline hoàn toàn.

## Xử lý lỗi

- File audio thiếu/lỗi tải: bỏ qua bài đó, hiện cảnh báo nhỏ trên UI (không chặn phát
  tiếp các bài còn lại) — vì đây là app luyện tập, không phải hệ thống chấm điểm thật,
  lỗi audio không nên làm crash cả buổi tập.
- localStorage bị chặn/đầy (hiếm, nhưng có thể xảy ra ở trình duyệt riêng tư): bộ tự
  ghép không lưu được thì báo người dùng biết, Bộ chuẩn vẫn hoạt động bình thường
  (không phụ thuộc localStorage).
- Service worker cache lỗi/không đăng ký được (trình duyệt cũ): app vẫn chạy được nếu
  đang có mạng, chỉ mất khả năng offline — không phải lỗi chặn toàn bộ chức năng.

## Testing

Không cần framework test cho MVP tĩnh này. 1 file kiểm tra tối thiểu theo yêu cầu
ponytail — self-check bằng JS thuần chạy qua `node`, assert:
- `standard-set.json` có đúng 13 phần tử, mỗi id tồn tại trong `stations.json`.
- `stations.json` không có id trùng nhau.
- Hàm dựng playlist từ 1 mảng id (dùng chung cho cả 2 bộ) trả về đúng thứ tự, đúng độ
  dài, kể cả khi có id lặp lại.

Kiểm tra bằng tay (không tự động hoá, vì liên quan audio thật + UI cảm quan): phát thử
Bộ chuẩn và 1 Bộ tự ghép trên điện thoại thật, xác nhận thứ tự đúng, có thể cài PWA,
tắt mạng vẫn phát được sau khi đã mở 1 lần.

## Việc còn mở (chặn implement)

1. **Nội dung audio thật** — user cung cấp: text hiệu lệnh từng bài (để sinh TTS) +
   nội dung/hành vi các tín hiệu phi-lời-nói (ting tong, tút, kết thúc).
2. **Timing chi tiết** của các bài cần giữ trạng thái theo thời gian thật (vd đề-pa
   lên dốc, dừng nhường người đi bộ) — cần user xác nhận độ trễ hợp lý khi có nội dung
   thật, hiện để mặc định phát nối tiếp không có độ trễ giữa các bài.
3. **Số "ô" tối đa** trong Bộ tự ghép — chưa chốt, quyết định sau khi ghép thử 1 bộ
   thật với audio thật (không chặn code, chỉ là 1 hằng số dễ đổi sau).
