/**
 * Seats Manager Module
 * Quản lý dữ liệu và nghiệp vụ đặt vé
 */

const ROWS = 8;
const COLS = 12;
const HOLD_MS = 2 * 60 * 1000; // 2 phút

/**
 * seat = { id, row, col, status: 'available'|'held'|'reserved', heldBy?: socketId, holdUntil?: number }
 */
let seats = [];
const seatIdToTimeout = new Map();

/**
 * Khởi tạo danh sách ghế
 * @returns {Array} Danh sách ghế đã được khởi tạo
 */
function initSeats() {
  seats = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = r * COLS + c;
      seats.push({ 
        id, 
        row: r, 
        col: c, 
        status: 'available' 
      });
    }
  }
  return seats;
}

/**
 * Lấy ghế theo ID
 * @param {number} id - ID của ghế
 * @returns {Object|null} Thông tin ghế hoặc null nếu không tìm thấy
 */
function getSeatById(id) {
  return seats.find((s) => s.id === id);
}

/**
 * Kiểm tra xem có thể giữ ghế không
 * @param {Object} seat - Thông tin ghế
 * @param {string} socketId - ID của socket
 * @returns {boolean} True nếu có thể giữ ghế
 */
function canHold(seat, socketId) {
  if (!seat) return false;
  if (seat.status === 'available') return true;
  if (seat.status === 'held' && seat.heldBy === socketId) return true; // cho phép gia hạn giữ chỗ
  return false;
}

/**
 * Giữ ghế cho một socket
 * @param {Object} seat - Thông tin ghế
 * @param {string} socketId - ID của socket
 * @returns {boolean} True nếu giữ ghế thành công
 */
function holdSeat(seat, socketId) {
  if (!canHold(seat, socketId)) {
    return false;
  }

  seat.status = 'held';
  seat.heldBy = socketId;
  seat.holdUntil = Date.now() + HOLD_MS;
  
  // Hủy timeout cũ nếu có
  const oldTimeout = seatIdToTimeout.get(seat.id);
  if (oldTimeout) {
    clearTimeout(oldTimeout);
  }
  
  // Tạo timeout mới
  const timeout = setTimeout(() => {
    // Tự động nhả ghế nếu vẫn còn giữ và đã hết hạn
    if (seat.status === 'held' && seat.heldBy === socketId && Date.now() >= (seat.holdUntil || 0)) {
      releaseSeat(seat);
    }
    seatIdToTimeout.delete(seat.id);
  }, HOLD_MS + 50); // Thêm 50ms buffer để đảm bảo timeout chính xác
  
  seatIdToTimeout.set(seat.id, timeout);
  return true;
}

/**
 * Xác nhận đặt ghế (chuyển từ held sang reserved)
 * @param {Object} seat - Thông tin ghế
 * @param {string} socketId - ID của socket
 * @returns {boolean} True nếu xác nhận thành công
 */
function confirmSeat(seat, socketId) {
  // Chỉ socket đang giữ ghế mới được xác nhận
  if (seat.status === 'held' && seat.heldBy === socketId) {
    seat.status = 'reserved';
    seat.heldBy = undefined;
    seat.holdUntil = undefined;
    
    // Hủy timeout
    const timeout = seatIdToTimeout.get(seat.id);
    if (timeout) {
      clearTimeout(timeout);
      seatIdToTimeout.delete(seat.id);
    }
    return true;
  }
  return false;
}

/**
 * Nhả ghế (chuyển từ held về available)
 * @param {Object} seat - Thông tin ghế
 * @returns {boolean} True nếu nhả ghế thành công
 */
function releaseSeat(seat) {
  if (seat.status !== 'held') {
    return false;
  }

  seat.status = 'available';
  seat.heldBy = undefined;
  seat.holdUntil = undefined;
  
  // Hủy timeout
  const timeout = seatIdToTimeout.get(seat.id);
  if (timeout) {
    clearTimeout(timeout);
    seatIdToTimeout.delete(seat.id);
  }
  return true;
}

/**
 * Nhả tất cả ghế của một socket
 * @param {string} socketId - ID của socket
 * @returns {Array} Danh sách ghế đã được nhả
 */
function releaseAllBySocket(socketId) {
  const releasedSeats = [];
  for (const seat of seats) {
    if (seat.status === 'held' && seat.heldBy === socketId) {
      if (releaseSeat(seat)) {
        releasedSeats.push(seat);
      }
    }
  }
  return releasedSeats;
}

/**
 * Lấy view công khai của ghế (không bao gồm thông tin nhạy cảm)
 * @param {Object} seat - Thông tin ghế
 * @returns {Object} View công khai của ghế
 */
function getSeatPublicView(seat) {
  // Không trả về trường heldBy ra phía client
  const { heldBy, ...rest } = seat;
  return rest;
}

/**
 * Lấy tất cả ghế với view công khai
 * @returns {Array} Danh sách ghế với view công khai
 */
function getAllSeatsPublicView() {
  return seats.map(getSeatPublicView);
}

/**
 * Lấy thông tin cấu hình ghế
 * @returns {Object} Thông tin cấu hình
 */
function getSeatsConfig() {
  return {
    rows: ROWS,
    cols: COLS,
    holdMs: HOLD_MS
  };
}

/**
 * Lấy thống kê ghế
 * @returns {Object} Thống kê ghế
 */
function getSeatsStats() {
  const stats = {
    total: seats.length,
    available: 0,
    held: 0,
    reserved: 0
  };
  
  for (const seat of seats) {
    stats[seat.status]++;
  }
  
  return stats;
}

module.exports = {
  // Các hàm chính
  initSeats,
  holdSeat,
  confirmSeat,
  releaseSeat,
  
  // Các hàm hỗ trợ
  getSeatById,
  canHold,
  releaseAllBySocket,
  getSeatPublicView,
  getAllSeatsPublicView,
  getSeatsConfig,
  getSeatsStats,
  
  // Constants
  ROWS,
  COLS,
  HOLD_MS
};
