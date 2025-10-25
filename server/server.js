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

// Quản lý người dùng online
const MAX_ONLINE_USERS = 5;
let onlineUsers = new Map(); // socketId -> { username, socketId, loginTime }

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

  // Gửi danh sách người dùng online hiện tại
  socket.emit('online:users', Array.from(onlineUsers.values()));

  // Xử lý yêu cầu lấy danh sách ghế
  socket.on('seats:get', () => {
    socket.emit('seats', {
      rows: ROWS,
      cols: COLS,
      seats: seats
    });
  });

  // Xử lý đăng nhập người dùng
  socket.on('user:login', (data) => {
    const { username } = data;
    
    // Kiểm tra giới hạn người dùng
    if (onlineUsers.size >= MAX_ONLINE_USERS) {
      socket.emit('user:limit:reached', { 
        message: `Đã đạt giới hạn ${MAX_ONLINE_USERS} người online. Vui lòng thử lại sau.` 
      });
      return;
    }

    // Kiểm tra tên người dùng đã tồn tại
    const existingUser = Array.from(onlineUsers.values()).find(user => user.username === username);
    if (existingUser) {
      socket.emit('login:error', { message: 'Tên người dùng đã được sử dụng' });
      return;
    }

    // Thêm người dùng vào danh sách online
    const user = {
      username,
      socketId: socket.id,
      loginTime: new Date()
    };
    onlineUsers.set(socket.id, user);

    // Gửi thông báo đăng nhập thành công
    socket.emit('login:success', { message: `Chào mừng ${username}!` });

    // Broadcast danh sách người dùng online cho tất cả client
    io.emit('online:users', Array.from(onlineUsers.values()));

    console.log(`User ${username} logged in. Online users: ${onlineUsers.size}`);
  });

  // Xử lý đăng xuất người dùng
  socket.on('user:logout', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Thả tất cả ghế đang giữ của người dùng này
      seats.forEach(seat => {
        if (seat.holderSocketId === socket.id && seat.status === 'held') {
          seat.status = 'available';
          seat.holderName = null;
          seat.holderSocketId = null;
          io.emit('seat:update', seat);
        }
      });

      onlineUsers.delete(socket.id);
      io.emit('online:users', Array.from(onlineUsers.values()));
      console.log(`User ${user.username} logged out. Online users: ${onlineUsers.size}`);
    }
  });

  // Xử lý giữ chỗ
  socket.on('seat:hold', (data) => {
    const { seatIds } = data;
    const user = onlineUsers.get(socket.id);
    
    if (!user) {
      socket.emit('seat:hold:error', { message: 'Vui lòng đăng nhập trước khi chọn ghế' });
      return;
    }

    let success = true;
    const updatedSeats = [];

    for (const id of seatIds) {
      const seat = seats.find(s => s.id === id);
      if (seat && seat.status === 'available') {
        seat.status = 'held';
        seat.holderName = user.username;
        seat.holderSocketId = socket.id;
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
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Thả tất cả ghế đang giữ của người dùng này khi disconnect
      seats.forEach(seat => {
        if (seat.holderSocketId === socket.id && seat.status === 'held') {
          seat.status = 'available';
          seat.holderName = null;
          seat.holderSocketId = null;
          io.emit('seat:update', seat);
        }
      });

      onlineUsers.delete(socket.id);
      io.emit('online:users', Array.from(onlineUsers.values()));
      console.log(`User ${user.username} disconnected. Online users: ${onlineUsers.size}`);
    } else {
      console.log('Client disconnected:', socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});