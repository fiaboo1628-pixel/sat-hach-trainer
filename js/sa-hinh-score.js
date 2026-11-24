// Điểm sa hình: 100 trừ dần theo các phím lỗi đã bấm (TT 12/2025/TT-BCA, Phụ lục IV mục C.I).
// Lỗi đình chỉ không trừ điểm: chỉ báo lỗi và dừng. Dưới 80 điểm là không đạt.
export const SA_HINH_START = 100;
export const SA_HINH_PASS = 80;

export function saHinhScore(pressed) {
  const score = pressed.reduce((sum, key) => sum - (key.points ?? 0), SA_HINH_START);
  if (pressed.some((key) => key.suspend)) return { score, status: 'suspended' };
  return { score, status: score < SA_HINH_PASS ? 'failed' : 'running' };
}
