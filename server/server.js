const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const seatsManager = require('./seatsManager');

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

// ===================== Khởi tạo ghế =====================
seatsManager.initSeats();

function broadcastSeat(seat) {
  io.emit('seat:update', seatsManager.getSeatPublicView(seat));
}

function emitSnapshot(socket) {
  const config = seatsManager.getSeatsConfig();
  socket.emit('seats', {
    rows: config.rows,
    cols: config.cols,
    seats: seatsManager.getAllSeatsPublicView()
  });
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
        const seat = seatsManager.getSeatById(id);
        if (seatsManager.holdSeat(seat, socket.id)) {
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
        const seat = seatsManager.getSeatById(id);
        if (seat && seatsManager.releaseSeat(seat)) {
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
        const seat = seatsManager.getSeatById(id);
        if (seat && seatsManager.confirmSeat(seat, socket.id)) {
          broadcastSeat(seat);
        }
      }
    } catch (e) {
      console.error('seats:reserve error', e);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
    const releasedSeats = seatsManager.releaseAllBySocket(socket.id);
    // Broadcast tất cả ghế đã được nhả
    for (const seat of releasedSeats) {
      broadcastSeat(seat);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server + Socket.IO listening on port ${PORT}`);
});


