# Sát Hạch Trainer — MVP: Module thi thử lý thuyết

Status: đã duyệt hướng, chờ chốt nguồn cào câu hỏi trước khi cào nội dung thật.

## Bối cảnh & mục tiêu

Đây là phần (2) nêu trong spec module âm thanh sa hình
(`2026-09-02-audio-sa-hinh-mvp-design.md`): "bộ đề luyện thi lý thuyết". Spec đó đã ghi
rõ phần này để sau — nay làm.

User là giáo viên dạy lái xe hạng B/C1. Ban đầu dự tính module lý thuyết thu phí, nhưng
quyết định ở bản MVP này: **miễn phí toàn bộ, chưa làm paywall/tài khoản** — giữ đúng
tinh thần MVP sa hình (riêng tư, không đăng nhập, chạy được không mạng, chi phí gần
bằng 0). Thu phí là việc của bản sau, khi đã có người dùng.

## Phạm vi MVP

Trong phạm vi:
- **Chỉ 1 tính năng: Thi thử** — sinh 1 đề ngẫu nhiên đúng cơ chế thi thật (xem "Thuật
  toán sinh đề"), làm bài có đếm giờ, nộp bài, chấm đậu/rớt.
- Hỗ trợ cả 2 hạng: **B** (30 câu/20 phút/đậu ≥27) và **C1** (35 câu/22 phút/đậu ≥32).
- Thêm vào cùng app sat-hach-trainer hiện có, dạng mục điều hướng mới ("Lý thuyết") bên
  cạnh "Sa hình" — không tách app/repo riêng.
- Chạy offline sau lần tải đầu, giống hệt module sa hình (cùng PWA, cùng service
  worker).

Ngoài phạm vi (để sau, không làm ở bản này):
- Thanh toán/paywall, tài khoản, đăng nhập.
- Luyện theo chương/chủ đề, ôn lại câu sai, lưu lịch sử làm bài.

## Nguồn dữ liệu & cơ cấu đề thi

Xác nhận với user (giáo viên, không phải suy từ web — search nhiều lần ra số liệu mâu
thuẫn nhau, kể cả giữa các trang luật/tin tức, vì lẫn quy định đã ban hành với dự thảo
chưa hiệu lực):

- Ngân hàng câu hỏi: **600 câu** (Cục CSGT — Bộ Công an), trong đó có **60 câu điểm
  liệt**.
- Hạng B: **30 câu/đề, 20 phút, đậu từ 27/30**, rớt nếu sai câu điểm liệt dù đủ điểm.
- Hạng C1: **35 câu/đề, 22 phút, đậu từ 32/35**, rớt nếu sai câu điểm liệt dù đủ điểm.
- Cả 2 hạng dùng chung toàn bộ 600 câu (không lọc riêng theo hạng).
- Mỗi câu: trắc nghiệm 1 đáp án đúng trong các lựa chọn (định dạng chuẩn của bộ đề
  này, không phải multi-select).

### Thuật toán sinh đề — phân tầng theo đúng 7 nhóm chủ đề của Cục CSGT

**Cập nhật 2026-09-06 (nâng cấp so với bản đầu):** ban đầu định random đều N câu trong
600 câu — sai, vì không đảm bảo đúng 1 câu điểm liệt/đề. Bản kế tiếp chỉ phân tầng 2
nhóm (1 điểm liệt + N-1 thường) vì lúc đó số liệu tỉ lệ theo nhóm chủ đề tìm trên web
mâu thuẫn nhau (cộng không ra đúng tổng). Nay đã có **nguồn chính thức đáng tin**: Cục
CSGT — Bộ Công an, đăng trên cổng chính sách Chính phủ, "Hướng dẫn sử dụng bộ 600 câu
hỏi dùng để sát hạch lái xe cơ giới đường bộ"
(xaydungchinhsach.chinhphu.vn/huong-dan-su-dung-bo-600-cau-hoi-dung-de-sat-hach-lai-xe-co-gioi-duong-bo-119250513110514585.htm),
áp dụng từ 01/6/2025 — số liệu cộng khớp đúng tổng cho cả 2 hạng. Thuật toán chốt: ép
đúng quota từng nhóm, không chỉ 2 nhóm nữa.

7 nhóm chủ đề và quota mỗi hạng (nhóm "tình huống mất ATGT nghiêm trọng" chính là nhóm
điểm liệt — 60 câu trong bộ 600, luôn đúng 1 câu/đề, xử lý như field `is_liet` sẵn có):

| Nhóm | slug `chapter` | Hạng B | Hạng C1 |
|---|---|---|---|
| Quy tắc giao thông | `quy-tac` | 8 | 10 |
| Tình huống mất ATGT nghiêm trọng (= điểm liệt) | `tinh-huong-atgt` | 1 | 1 |
| Văn hóa giao thông / đạo đức / PCCC-cứu hộ | `van-hoa` | 1 | 1 |
| Kỹ thuật lái xe | `ky-thuat` | 1 | 2 |
| Cấu tạo, sửa chữa | `cau-tao` | 1 | 1 |
| Báo hiệu đường bộ | `bao-hieu` | 9 | 10 |
| Xử lý tình huống (giải thế sa hình) | `xu-ly-tinh-huong` | 9 | 10 |
| **Tổng** | | **30** | **35** |

```
đề = 1 câu random từ nhóm điểm liệt (is_liet = true, chapter = "tinh-huong-atgt")
   + quota câu random (không trùng) từ mỗi nhóm còn lại trong 6 nhóm trên
   rồi trộn thứ tự hiển thị
```

Vì nhóm điểm liệt trùng khớp hoàn toàn với field `is_liet` đã có (60 câu điểm liệt =
đúng số câu thuộc nhóm này trong bộ 600), giữ nguyên cách xử lý cũ cho nhóm này (rút từ
`is_liet = true`) thay vì lọc riêng theo `chapter`, để 2 field độc lập cross-check lẫn
nhau — câu nào `is_liet` mà `chapter` không phải `tinh-huong-atgt` (hoặc ngược lại) là
dấu hiệu gắn nhãn sai lúc cào, cần validate.

Về nhóm "20 đề hạng B / 18 đề hạng C1" hay gặp trên các trang luyện thi: đó là cách
người ta **chia bộ 600 câu thành từng phần để học** (600÷30=20, tương tự cho C1),
không phải cơ chế thi thật — không liên quan tới 7 nhóm chủ đề ở trên.

## Kiến trúc

```
[tools/scrape-theory-questions.*]        <- script cào 1 lần (dev-time), KHÔNG chạy
        |                                    trong app lúc runtime (không phụ thuộc
        v                                    mạng/bên thứ 3 khi user dùng app)
[content/theory/questions.json]          <- 600 câu, id theo số câu chính thức
[content/theory/images/*.jpg]            <- ảnh biển báo/sa hình, tên file khớp field
        |                                    "image" trong questions.json
        v
[js/theory.js]                           <- sinh đề (phân tầng), đếm giờ, chấm điểm —
        |                                    vanilla JS, dùng chung service-worker/style
        v
[index.html — thêm mục "Lý thuyết"]      <- 2 màn: chọn hạng -> làm bài -> kết quả
        |
        v
[service-worker.js]                      <- cache thêm asset lý thuyết, bump CACHE_NAME
```

Không backend, không database, không tài khoản — giống hệt kiến trúc module sa hình.
Cào dữ liệu là bước content-authoring ngoài app (giống việc sinh audio TTS ở module sa
hình), chạy 1 lần, kết quả là file JSON tĩnh check vào repo.

**Ship code trước với data mẫu (placeholder), thay bằng data cào thật sau** — cùng
pattern với audio sa hình (code chạy được với 11 file beep giả trước khi có audio
thật). Ở đây: viết ~10-15 câu mẫu tay (đủ để có vài câu điểm liệt) để code + test chạy
được ngay, không bị chặn bởi việc chưa chốt nguồn cào. Khi cào xong 600 câu thật, chỉ
là thay file `questions.json` + bump `CACHE_NAME`, không đổi code sinh đề/chấm điểm.

## Data model

`content/theory/questions.json`:

```json
[
  {
    "id": "q001",
    "text": "Khi gặp biển báo này, người lái xe phải làm gì?",
    "choices": ["Dừng lại", "Giảm tốc độ, nhường đường", "Đi tiếp bình thường"],
    "answer": 1,
    "is_liet": false,
    "chapter": "bien-bao",
    "image": "q001.jpg"
  },
  {
    "id": "q045",
    "text": "Người lái xe sau khi uống rượu, bia có được phép điều khiển xe không?",
    "choices": ["Có, nếu uống ít", "Không, tuyệt đối không"],
    "answer": 1,
    "is_liet": true,
    "chapter": "tinh-huong-mat-atgt",
    "image": null
  }
]
```

- `id`: theo đúng số câu chính thức trong bộ 600 câu (q001–q600) — **không** đánh số
  theo thứ tự cào được. Lý do: đây là key để nạp đè dữ liệu (sửa 1 câu, thay 1 ảnh) mà
  không lệch nếu thứ tự liệt kê trên trang nguồn thay đổi hoặc phải đổi nguồn cào sau
  này.
- `is_liet`: cờ dữ liệu thuần, không phải logic code — sửa sai (nếu có) chỉ là sửa 1
  dòng JSON.
- `chapter`: 1 trong 7 slug ở bảng "Thuật toán sinh đề" — dùng thật bởi `generateExam`
  (không còn là field dự phòng chưa dùng như bản đầu).
- `image`: tên file trong `content/theory/images/`, `null` nếu câu không cần ảnh.

`js/theory-config.js` (hằng số, không phải data cào):

```js
const HANG_CONFIG = {
  B:  { count: 30, minutes: 20, passScore: 27,
        groups: { "quy-tac": 8, "van-hoa": 1, "ky-thuat": 1, "cau-tao": 1, "bao-hieu": 9, "xu-ly-tinh-huong": 9 } },
  C1: { count: 35, minutes: 22, passScore: 32,
        groups: { "quy-tac": 10, "van-hoa": 1, "ky-thuat": 2, "cau-tao": 1, "bao-hieu": 10, "xu-ly-tinh-huong": 10 } },
};
```

(Nhóm điểm liệt/`tinh-huong-atgt` không nằm trong `groups` — quota của nó luôn là 1 và
xử lý riêng qua field `is_liet` như mô tả ở "Thuật toán sinh đề".)

Không dùng localStorage cho module này ở MVP (không lưu lịch sử, không lưu hạng đã
chọn lần trước — làm lại từ đầu mỗi lần vào, đúng phạm vi đã chốt).

## Luồng chính (component)

- **Màn hình chọn hạng**: 2 nút "Hạng B" / "Hạng C1".
- **Màn hình làm bài**: hiện toàn bộ N câu trên 1 trang (cuộn), mỗi câu có ảnh (nếu có)
  + các lựa chọn (radio, chọn 1). Đồng hồ đếm ngược góc trên, hết giờ tự động nộp bài
  bằng đáp án đã chọn tới lúc đó (câu chưa trả lời tính sai). Nút "Nộp bài" chủ động.
- **Màn hình kết quả**: số câu đúng/tổng, có sai câu điểm liệt hay không, kết luận
  **Đậu**/**Rớt** theo đúng luật (đủ điểm NHƯNG sai điểm liệt vẫn Rớt). Nút "Thi lại"
  quay về màn chọn hạng (sinh đề mới, không giữ đề cũ).

## Xử lý lỗi

- Câu thiếu ảnh do lỗi cào (không nên xảy ra ở bản chính thức, nhưng phải không sập
  UI nếu xảy ra): hiện câu hỏi không kèm ảnh thay vì vỡ layout hoặc chặn cả bài thi.
- Hết giờ giữa chừng: tự nộp bài như mô tả trên, không có cảnh báo chặn (không phải hệ
  thống thi thật, không cần nghiêm ngặt hơn cần thiết).
- Service worker/cache: dùng lại cơ chế đã có ở module sa hình, chỉ thêm asset mới vào
  danh sách cache + bump `CACHE_NAME` khi đổi nội dung câu hỏi.

## QA nội dung (bắt buộc trước khi coi là "chính thức", không phải runtime code)

Cào từ 1 trang thứ 3 không đảm bảo khớp 100% ảnh gốc Bộ Công an. Sau khi cào:

1. Script đếm: số câu thuộc nhóm "cần ảnh" (biển báo, sa hình) so với số câu thực sự
   có field `image` khác `null` sau khi cào → liệt kê câu thiếu.
2. Script đếm: tổng số câu = 600, số câu `is_liet = true` = 60, không trùng `id`.
3. **Không tự động hoá được**: đúng/khớp của ảnh so với bản gốc Bộ Công an cần user
   (hoặc người có bộ đề gốc) soát lại thủ công — liệt kê ra để duyệt, không âm thầm
   coi là xong. Đây là bước chặn "công bố nội dung chính thức", không chặn việc viết
   code (code chạy tốt với data mẫu/data cào thô).

## Testing

Self-check bằng `node --test`, giống pattern module sa hình:
- Data mẫu (và sau này data thật): đúng số lượng câu quy định, `id` không trùng,
  không rỗng `choices`/`answer` hợp lệ (index trong khoảng `choices`).
- Hàm sinh đề (`generateExam`): chạy nhiều lần với data mẫu, mỗi lần luôn đúng N câu,
  luôn đúng 1 câu `is_liet`, đúng quota từng nhóm `chapter`, không câu nào lặp trong 1
  đề, báo lỗi rõ ràng khi 1 nhóm không đủ câu.
- Data: `is_liet = true` phải khớp `chapter = "tinh-huong-atgt"` và ngược lại (cross-
  check 2 field độc lập, bắt lỗi gắn nhãn khi cào data thật).
- Hàm chấm điểm (`gradeExam`): case đủ điểm nhưng sai câu điểm liệt → Rớt; case đủ
  điểm và đúng hết điểm liệt → Đậu; case thiếu điểm dù đúng hết điểm liệt → Rớt.

Kiểm tra bằng tay (không tự động hoá): làm thử 1 lượt Hạng B và 1 lượt Hạng C1 trên
điện thoại thật, xác nhận đếm giờ đúng, hết giờ tự nộp, cài PWA/tắt mạng vẫn làm được.

## Việc còn mở (chặn nội dung thật, không chặn code)

1. **Chọn trang nguồn cụ thể để cào** — chưa chốt. Cần nguồn có đủ text + đáp án đúng +
   cờ điểm liệt rõ ràng + ảnh, và đánh số câu theo đúng "Câu N" chính thức (1–600) để
   khớp với `id` trong data model. **Giờ còn cần thêm**: nguồn phải gắn được đúng 1
   trong 7 nhóm chủ đề (bảng ở "Thuật toán sinh đề") cho từng câu — nếu nguồn không có
   sẵn nhãn nhóm, phải tự phân loại thủ công/bán tự động 600 câu vào 7 nhóm trước khi
   nạp vào app, nếu không `generateExam` sẽ báo lỗi thiếu câu ở nhóm nào đó.
2. **Viết + chạy script cào**, sinh `questions.json` + tải ảnh về `content/theory/images/`.
3. **QA ảnh thủ công** theo mục "QA nội dung" ở trên — user duyệt trước khi coi là bản
   chính thức thay cho data mẫu.
