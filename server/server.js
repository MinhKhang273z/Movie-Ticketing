const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ===================== Bộ nhớ tạm (in-memory) lưu ghế =====================
const ROWS = 8;
const COLS = 12;
const HOLD_MS = 2 * 60 * 1000; // 2 phút

/**
 * seat = { id, row, col, status: 'available'|'held'|'reserved', heldBy?: socketId, holdUntil?: number }
 */
const seats = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const id = r * COLS + c;
    seats.push({ id, row: r, col: c, status: 'available' });
  }
}

// Theo dõi timeout của ghế đang giữ để tự động hủy theo seat id
const seatIdToTimeout = new Map();

function getSeatById(id) {
  return seats.find((s) => s.id === id);
}

function broadcastSeat(seat) {
  io.emit('seat:update', seatPublicView(seat));
}

function seatPublicView(seat) {
  // Không trả về trường heldBy ra phía client
  const { heldBy, ...rest } = seat;
  return rest;
}

function emitSnapshot(socket) {
  socket.emit('seats', {
    rows: ROWS,
    cols: COLS,
    seats: seats.map(seatPublicView)
  });
}

function canHold(seat, socketId) {
  if (!seat) return false;
  if (seat.status === 'available') return true;
  if (seat.status === 'held' && seat.heldBy === socketId) return true; // cho phép gia hạn giữ chỗ
  return false;
}

function holdSeat(seat, socketId) {
  seat.status = 'held';
  seat.heldBy = socketId;
  seat.holdUntil = Date.now() + HOLD_MS;
  // hủy timeout cũ nếu có
  const old = seatIdToTimeout.get(seat.id);
  if (old) clearTimeout(old);
  const timeout = setTimeout(() => {
    // Tự động nhả ghế nếu vẫn còn giữ và đã hết hạn
    if (seat.status === 'held' && seat.heldBy === socketId && Date.now() >= (seat.holdUntil || 0)) {
      releaseSeat(seat);
      broadcastSeat(seat);
    }
    seatIdToTimeout.delete(seat.id);
  }, HOLD_MS + 50);
  seatIdToTimeout.set(seat.id, timeout);
}

function releaseSeat(seat) {
  seat.status = 'available';
  seat.heldBy = undefined;
  seat.holdUntil = undefined;
  const t = seatIdToTimeout.get(seat.id);
  if (t) {
    clearTimeout(t);
    seatIdToTimeout.delete(seat.id);
  }
}

function reserveSeat(seat, socketId) {
  // Chỉ socket đang giữ ghế mới được xác nhận
  if (seat.status === 'held' && seat.heldBy === socketId) {
    seat.status = 'reserved';
    seat.heldBy = undefined;
    seat.holdUntil = undefined;
    const t = seatIdToTimeout.get(seat.id);
    if (t) {
      clearTimeout(t);
      seatIdToTimeout.delete(seat.id);
    }
    return true;
  }
  return false;
}

function releaseAllBySocket(socketId) {
  let changed = false;
  for (const seat of seats) {
    if (seat.status === 'held' && seat.heldBy === socketId) {
      releaseSeat(seat);
      changed = true;
      broadcastSeat(seat);
    }
  }
  return changed;
}

// ===================== Xử lý sự kiện Socket.IO =====================
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('welcome', { message: 'Welcome to Movie Ticketing realtime API' });

  socket.on('seats:get', () => {
    emitSnapshot(socket);
  });

  socket.on('seats:hold', (payload) => {
    try {
      const ids = Array.isArray(payload?.seatIds) ? payload.seatIds : [];
      for (const id of ids) {
        const seat = getSeatById(id);
        if (canHold(seat, socket.id)) {
          holdSeat(seat, socket.id);
          broadcastSeat(seat);
        }
      }
    } catch (e) {
      console.error('seats:hold error', e);
    }
  });

  socket.on('seats:release', (payload) => {
    try {
      const ids = Array.isArray(payload?.seatIds) ? payload.seatIds : [];
      for (const id of ids) {
        const seat = getSeatById(id);
        if (seat && seat.status === 'held' && seat.heldBy === socket.id) {
          releaseSeat(seat);
          broadcastSeat(seat);
        }
      }
    } catch (e) {
      console.error('seats:release error', e);
    }
  });

  socket.on('seats:reserve', (payload) => {
    try {
      const ids = Array.isArray(payload?.seatIds) ? payload.seatIds : [];
      for (const id of ids) {
        const seat = getSeatById(id);
        if (seat && reserveSeat(seat, socket.id)) {
          broadcastSeat(seat);
        }
      }
    } catch (e) {
      console.error('seats:reserve error', e);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
    releaseAllBySocket(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server + Socket.IO listening on port ${PORT}`);
});


