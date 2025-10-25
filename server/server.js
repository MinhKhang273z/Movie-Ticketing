const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Mock data cho ghế
const ROWS = 8;
const COLS = 12;
let seats = [];
let seatIdCounter = 0;

function initializeSeats() {
  seats = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      seats.push({
        id: seatIdCounter++,
        row,
        col,
        status: 'available' // available, held, reserved
      });
    }
  }
}

initializeSeats();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Gửi welcome message
  socket.emit('welcome', { message: 'Connected to Movie Ticketing Server' });

  // Xử lý yêu cầu lấy danh sách ghế
  socket.on('seats:get', () => {
    socket.emit('seats', {
      rows: ROWS,
      cols: COLS,
      seats: seats
    });
  });

  // Xử lý giữ chỗ
  socket.on('seat:hold', (data) => {
    const { seatIds } = data;
    let success = true;
    const updatedSeats = [];

    for (const id of seatIds) {
      const seat = seats.find(s => s.id === id);
      if (seat && seat.status === 'available') {
        seat.status = 'held';
        updatedSeats.push(seat);
      } else {
        success = false;
        break;
      }
    }

    if (success) {
      // Broadcast cập nhật cho tất cả client
      updatedSeats.forEach(seat => {
        io.emit('seat:update', seat);
      });
      socket.emit('seat:hold:success', { message: 'Giữ chỗ thành công' });
    } else {
      socket.emit('seat:hold:error', { message: 'Không thể giữ chỗ, ghế không khả dụng' });
    }
  });

  // Xử lý xác nhận đặt chỗ
  socket.on('seat:confirm', (data) => {
    const { seatIds } = data;
    let success = true;
    const updatedSeats = [];

    for (const id of seatIds) {
      const seat = seats.find(s => s.id === id);
      if (seat && (seat.status === 'available' || seat.status === 'held')) {
        seat.status = 'reserved';
        updatedSeats.push(seat);
      } else {
        success = false;
        break;
      }
    }

    if (success) {
      updatedSeats.forEach(seat => {
        io.emit('seat:update', seat);
      });
      socket.emit('seat:confirm:success', { message: 'Đặt chỗ thành công' });
    } else {
      socket.emit('seat:confirm:error', { message: 'Không thể đặt chỗ, ghế không khả dụng' });
    }
  });

  // Xử lý thả chỗ
  socket.on('seat:release', (data) => {
    const { seatIds } = data;
    const updatedSeats = [];

    for (const id of seatIds) {
      const seat = seats.find(s => s.id === id);
      if (seat && seat.status === 'held') {
        seat.status = 'available';
        updatedSeats.push(seat);
      }
    }

    updatedSeats.forEach(seat => {
      io.emit('seat:update', seat);
    });
    socket.emit('seat:release:success', { message: 'Thả chỗ thành công' });
  });

  // Xử lý đặt chỗ (legacy, có thể giữ để tương thích)
  socket.on('seats:reserve', (data) => {
    const { seatIds } = data;
    let success = true;
    const updatedSeats = [];

    for (const id of seatIds) {
      const seat = seats.find(s => s.id === id);
      if (seat && seat.status === 'available') {
        seat.status = 'reserved';
        updatedSeats.push(seat);
      } else {
        success = false;
        break;
      }
    }

    if (success) {
      updatedSeats.forEach(seat => {
        io.emit('seat:update', seat);
      });
      socket.emit('seats:update', { seats: updatedSeats });
    } else {
      socket.emit('seats:update', { error: 'Không thể đặt chỗ' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});