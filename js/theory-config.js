import { MOTORCYCLE_IDS, MOTORCYCLE_LIET_IDS, TRICYCLE_IDS, TRICYCLE_LIET_IDS } from './theory-pools.js';

const smallExam = {
  count: 25,
  minutes: 19,
  groups: { 'quy-tac': 8, 'van-hoa': 1, 'ky-thuat+cau-tao': 1, 'bao-hieu': 8, 'xu-ly-tinh-huong': 6 },
};
const motorcycle = { ...smallExam, pool: MOTORCYCLE_IDS, lietPool: MOTORCYCLE_LIET_IDS };
const largeExam = {
  count: 45,
  minutes: 26,
  passScore: 41,
  groups: { 'quy-tac': 10, 'van-hoa': 1, 'ky-thuat': 2, 'cau-tao': 1, 'bao-hieu': 16, 'xu-ly-tinh-huong': 14 },
};

// Số câu và cơ cấu: Công văn 2262/CSGT-P5. Thời gian và điểm đạt: Phụ lục II–VI,
// Thông tư 12/2025/TT-BCA, trong thời gian chuyển tiếp theo Thông tư 108/2026/TT-BCA.
export const HANG_CONFIG = {
  A1: { ...motorcycle, passScore: 21 },
  A: { ...motorcycle, passScore: 23 },
  B1: { ...smallExam, passScore: 23, pool: TRICYCLE_IDS, lietPool: TRICYCLE_LIET_IDS },
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
  C: {
    count: 40,
    minutes: 24,
    passScore: 36,
    groups: { 'quy-tac': 10, 'van-hoa': 1, 'ky-thuat': 2, 'cau-tao': 1, 'bao-hieu': 14, 'xu-ly-tinh-huong': 11 },
  },
  D1: largeExam,
  D2: largeExam,
  D: largeExam,
  BE: largeExam,
  C1E: largeExam,
  CE: largeExam,
  D1E: largeExam,
  D2E: largeExam,
  DE: largeExam,
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
