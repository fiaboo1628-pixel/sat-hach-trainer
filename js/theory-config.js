export const HANG_CONFIG = {
  B: {
    count: 30,
    minutes: 20,
    passScore: 27,
    groups: { 'quy-tac': 8, 'van-hoa': 1, 'ky-thuat': 1, 'cau-tao': 1, 'bao-hieu': 9, 'xu-ly-tinh-huong': 9 },
  },
  C1: {
    count: 35,
    minutes: 22,
    passScore: 32,
    groups: { 'quy-tac': 10, 'van-hoa': 1, 'ky-thuat': 2, 'cau-tao': 1, 'bao-hieu': 10, 'xu-ly-tinh-huong': 10 },
  },
};

// Display order + label for "ôn tập theo chủ đề" (practice mode) topic picker.
export const CHAPTER_LABELS = {
  'quy-tac': 'Quy định chung & quy tắc giao thông',
  'van-hoa': 'Văn hóa giao thông, đạo đức, PCCC',
  'ky-thuat': 'Kỹ thuật lái xe',
  'cau-tao': 'Cấu tạo và sửa chữa',
  'bao-hieu': 'Báo hiệu đường bộ',
  'xu-ly-tinh-huong': 'Giải thế sa hình & xử lý tình huống',
  'tinh-huong-atgt': '60 câu điểm liệt',
};

export const CHAPTER_ORDER = Object.keys(CHAPTER_LABELS);
