# 🎬 Movie Ticketing System

Hệ thống đặt vé xem phim real-time với Socket.IO & React. Ứng dụng cho phép nhiều người dùng cùng lúc chọn ghế, giữ chỗ và đặt vé xem phim với cập nhật thời gian thực.

## ✨ Tính năng

- 🎫 **Đăng nhập**: Hỗ trợ tối đa 5 người dùng online cùng lúc
- 🪑 **Chọn ghế**: Chọn/bỏ chọn ghế với màu sắc trực quan
- 🔒 **Giữ chỗ**: Giữ ghế tạm thời (hiển thị màu cam)
- 🎟️ **Đặt chỗ**: Xác nhận đặt ghế (màu xám)
- 🔄 **Real-time**: Cập nhật trạng thái ghế theo thời gian thực
- 👥 **Quản lý người dùng**: Hiển thị người dùng online và ghế đang được giữ

## 🏗️ Kiến trúc

Ứng dụng gồm 2 phần chính:

- **Server**: Express + Socket.IO (Port 5000)
- **Client**: React + Vite + Socket.IO Client (Port 5173)

```
movie-ticketing/
├── 📂 server/
│   ├── server.js           # Socket.IO server
│   ├── package.json
│   └── node_modules/
│
├── 📂 client/
│   ├── 📂 src/
│   │   ├── App.jsx         # Component chính
│   │   ├── index.jsx       # Entry point
│   │   ├── 📂 components/
│   │   │   ├── SeatGrid.jsx    # Grid hiển thị ghế
│   │   │   └── UserLogin.jsx   # Form đăng nhập
│   │   └── socketHandler.js   # Socket.IO handler
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── node_modules/
│
└── README.md
```

## 🚀 Cài đặt và Chạy

### 1. Cài đặt Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 2. Chạy ứng dụng

Mở 2 terminal riêng biệt:

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```
✅ Server chạy tại: `http://localhost:5000`  
🔍 Health check: `http://localhost:5000/health`

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```
✅ Client chạy tại: `http://localhost:5173`

## 🎮 Hướng dẫn sử dụng

1. **Đăng nhập**: Nhập tên người dùng (tối đa 5 người cùng lúc)
2. **Chọn ghế**: Click vào ghế để chọn (màu xanh lá)
3. **Bỏ chọn**: Click lại vào ghế đã chọn hoặc nút "Bỏ chọn"
4. **Giữ chỗ**: Nhấn nút "Giữ chỗ" để giữ ghế (màu cam)
5. **Thả chỗ**: Nhấn nút "Thả chỗ" để trả ghế về available
6. **Đặt chỗ**: Xác nhận đặt chỗ (status: reserved, màu xám)

## 🎨 Bảng màu ghế

| Màu | Ý nghĩa | Trạng thái |
|-----|---------|-----------|
| 🔵 Xám xanh | Ghế trống | `available` |
| 🟣 Tím | VIP | `available` (hàng cuối) |
| 🟢 Xanh lá | Đang chọn | `selected` |
| 🟠 Cam vàng | Đang giữ | `held` |
| ⚫ Xám đen | Đã đặt | `reserved` |

## 🛠️ Công nghệ

- **Frontend**: React 18, Vite, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Real-time**: WebSocket via Socket.IO

## 📝 Ghi chú

- Socket.IO client kết nối tới `http://localhost:5000` (cấu hình trong `client/src/App.jsx`)
- Nếu thay đổi cổng server, cần cập nhật URL trong `client/src/socketHandler.js`
- Tối đa 5 người dùng online cùng lúc
- Ghế được giữ tạm thời khi người dùng disconnect sẽ tự động trả về available

## 👥 Người phát triển

Nhóm phát triển dự án Movie Ticketing System
