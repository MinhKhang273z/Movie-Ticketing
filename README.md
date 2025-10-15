# Movie Ticketing System (Multi Client-Server using Socket.IO & React)

Ứng dụng mẫu gồm `server` (Express + Socket.IO) và `client` (React + socket.io-client).

Cấu trúc thư mục:

movie-ticketing/
 ├── server/
 │    ├── server.js
 │    ├── package.json
 ├── client/
 │    ├── index.html
 │    ├── src/
 │    │    ├── App.jsx
 │    │    ├── index.jsx
 │    ├── vite.config.js
 │    ├── package.json
 ├── README.md

Hướng dẫn nhanh
- Server:
  - cd server
  - npm install
  - npm run dev
  - Kiểm tra: http://localhost:5000/health
- Client (Vite):
  - cd client
  - npm install
  - npm run dev
  - Mặc định chạy tại: http://localhost:5173

Ghi chú
- Socket.IO client sẽ kết nối tới `http://localhost:5000` (cấu hình trong `client/src/App.jsx`). Nếu bạn đổi cổng server, hãy cập nhật lại URL này.
