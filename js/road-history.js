// Lịch sử buổi thi đường trường, lưu trên máy người dùng (không gửi đi đâu).
export const HISTORY_KEY = 'duong-truong-lich-su';
export const HISTORY_LIMIT = 30;

export function createHistoryStore(storage) {
  const read = () => {
    try {
      const data = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };
  const write = (list) => storage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));

  return {
    list: read,
    // Cùng createdAt là cùng buổi (vd. hoàn tác sau khi đã lưu): thay bản cũ.
    add(result) {
      write([result, ...read().filter((r) => r.createdAt !== result.createdAt)]);
    },
    remove(createdAt) {
      write(read().filter((r) => r.createdAt !== createdAt));
    },
    clear() {
      write([]);
    },
  };
}
