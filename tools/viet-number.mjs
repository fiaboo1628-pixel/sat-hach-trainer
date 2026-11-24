// Đọc số 0–100 thành chữ (giọng Bắc) cho câu đọc điểm: "tám mươi lăm", "hai mươi mốt".
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

export function vietNumber(n) {
  if (n === 100) return 'một trăm';
  if (n < 10) return DIGITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  const head = tens === 1 ? 'mười' : `${DIGITS[tens]} mươi`;
  if (unit === 0) return head;
  if (unit === 5) return `${head} lăm`;
  if (unit === 1 && tens > 1) return `${head} mốt`;
  if (unit === 4 && tens > 1) return `${head} tư`;
  return `${head} ${DIGITS[unit]}`;
}
