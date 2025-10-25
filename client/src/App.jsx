import SeatGrid from './components/SeatGrid'; // <-- Đã import (TV3)
import UserLogin from './components/UserLogin';
import { useEffect, useMemo, useState } from 'react';
import socketHandler from './socketHandler';

// XÓA STATUS_COLOR (đã chuyển sang SeatGrid.jsx)

export default function App() {
  const [connected, setConnected] = useState(false);
  const [welcome, setWelcome] = useState('');
  const [seats, setSeats] = useState([]); // { id, row, col, status, holderName, holderSocketId }
  const [selectedSeatIds, setSelectedSeatIds] = useState(new Set());
  const [gridSize, setGridSize] = useState({ rows: 8, cols: 12 });
  const [submitting, setSubmitting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // { username, socketId }
  const [onlineUsers, setOnlineUsers] = useState([]); // Danh sách người dùng online

  // Tạo ma trận ghế để render lưới nhanh
  const seatMatrix = useMemo(() => {
    const matrix = Array.from({ length: gridSize.rows }, () => Array(gridSize.cols).fill(null));
    for (const seat of seats) {
      const r = seat.row;
      const c = seat.col;
      if (r >= 0 && r < gridSize.rows && c >= 0 && c < gridSize.cols) {
        matrix[r][c] = seat;
      }
    }
    return matrix;
  }, [seats, gridSize]);

  useEffect(() => {
    socketHandler.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onWelcome = (payload) => setWelcome(payload?.message || '');

    // Nhận toàn bộ trạng thái ghế (snapshot)
    const onSeats = (payload) => {
      if (!payload) return;
      const { rows, cols, seats: incomingSeats } = payload;
      if (rows && cols) setGridSize({ rows, cols });
      if (Array.isArray(incomingSeats)) setSeats(incomingSeats);
    };

    // Nhận cập nhật cho một ghế đơn lẻ
    const onSeatUpdate = (seat) => {
      if (!seat || seat.id == null) return;
      setSeats((prev) => {
        const idx = prev.findIndex((s) => s.id === seat.id);
        if (idx === -1) return prev;
        const updated = prev.slice();
        updated[idx] = { ...prev[idx], ...seat };
        return updated;
      });
      // Nếu ghế không còn trạng thái 'available', bỏ chọn ghế đó
      if (seat.status && seat.status !== 'available') {
        setSelectedSeatIds((prev) => {
          if (!prev.has(seat.id)) return prev;
          const next = new Set(prev);
          next.delete(seat.id);
          return next;
        });
      }
    };

    const onNotification = (notif) => {
      setNotifications((prev) => [...prev, notif]);
      // Tự động xóa thông báo sau 5 giây
      setTimeout(() => {
        setNotifications((prev) => prev.filter(n => n !== notif));
      }, 5000);
    };

    // Xử lý cập nhật danh sách người dùng online
    const onOnlineUsers = (users) => {
      setOnlineUsers(users || []);
    };

    // Xử lý thông báo giới hạn người dùng
    const onUserLimitReached = (data) => {
      setNotifications((prev) => [...prev, { 
        type: 'error', 
        message: data.message || 'Đã đạt giới hạn 5 người online' 
      }]);
    };

    // Xử lý đăng nhập thành công
    const onLoginSuccess = (data) => {
      setNotifications((prev) => [...prev, { 
        type: 'success', 
        message: data.message || 'Đăng nhập thành công' 
      }]);
    };

    // Xử lý đăng nhập thất bại
    const onLoginError = (data) => {
      setNotifications((prev) => [...prev, { 
        type: 'error', 
        message: data.message || 'Đăng nhập thất bại' 
      }]);
    };

    socketHandler.on('connect', onConnect);
    socketHandler.on('disconnect', onDisconnect);
    socketHandler.on('welcome', onWelcome);
    socketHandler.on('seats', onSeats);
    socketHandler.on('seat:update', onSeatUpdate);
    socketHandler.on('notification', onNotification);
    socketHandler.on('online:users', onOnlineUsers);
    socketHandler.on('user:limit:reached', onUserLimitReached);
    socketHandler.on('login:success', onLoginSuccess);
    socketHandler.on('login:error', onLoginError);

    // Yêu cầu server gửi snapshot ghế ban đầu
    socketHandler.getSeats();

    return () => {
      socketHandler.off('connect', onConnect);
      socketHandler.off('disconnect', onDisconnect);
      socketHandler.off('welcome', onWelcome);
      socketHandler.off('seats', onSeats);
      socketHandler.off('seat:update', onSeatUpdate);
      socketHandler.off('notification', onNotification);
      socketHandler.off('online:users', onOnlineUsers);
      socketHandler.off('user:limit:reached', onUserLimitReached);
      socketHandler.off('login:success', onLoginSuccess);
      socketHandler.off('login:error', onLoginError);
    };
  }, []);

  const toggleSeat = (seat) => {
    if (!seat) return;
    if (seat.status !== 'available') return; // chỉ chọn ghế đang trống
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id); else next.add(seat.id);
      return next;
    });
  };

  // Giữ ghế khi người dùng chọn
  const holdSeats = async () => {
    if (selectedSeatIds.size === 0) return;
    setSubmitting(true);
    try {
      const ids = Array.from(selectedSeatIds);
      socketHandler.holdSeats(ids);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSelection = async () => {
    if (selectedSeatIds.size === 0) return;
    setSubmitting(true);
    try {
      const ids = Array.from(selectedSeatIds);
      socketHandler.confirmSeats(ids);
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý đăng nhập người dùng
  const handleLogin = async (username) => {
    try {
      await socketHandler.login(username);
      setCurrentUser({ username, socketId: socketHandler.socket?.id });
    } catch (error) {
      console.error('Login failed:', error);
      setNotifications((prev) => [...prev, { 
        type: 'error', 
        message: 'Đăng nhập thất bại' 
      }]);
    }
  };

  // Xử lý đăng xuất
  const handleLogout = () => {
    socketHandler.logout();
    setCurrentUser(null);
    setSelectedSeatIds(new Set());
  };

  // XÓA HÀM renderSeat (đã chuyển sang SeatGrid.jsx)

  const selectedCount = selectedSeatIds.size;

  // Hiển thị giao diện đăng nhập nếu chưa đăng nhập
  if (!currentUser) {
    return <UserLogin onLogin={handleLogin} isConnected={connected} />;
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: 'white' }}>Movie Ticketing</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <StatusPill connected={connected} />
              <span style={{ opacity: 0.35 }}>•</span>
              <span style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                fontSize: 13
              }}>
                {welcome || 'Realtime ready'}
              </span>
              <span style={{ opacity: 0.35 }}>•</span>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                Xin chào, <strong>{currentUser.username}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge color="#64748b" text="Thường" />
              <Badge color="#8b5cf6" text="VIP" />
              <Badge color="#374151" text="Đã đặt" />
              <Badge color="#f59e0b" text="Giữ chỗ" />
              <Badge color="#22c55e" text="Đang chọn" />
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              Đăng xuất
            </button>
          </div>

        </header>

        <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ height: 8, background: 'linear-gradient(180deg,#94a3b8,#475569)', borderRadius: 9999, width: '60%', margin: '0 auto', boxShadow: '0 8px 24px rgba(0,0,0,0.45) inset' }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>MÀN HÌNH</div>
          </div>

          {/* GỌI COMPONENT CỦA BẠN (THÀNH VIÊN 3) TẠI ĐÂY */}
          <SeatGrid
            seatMatrix={seatMatrix}
            gridSize={gridSize}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={toggleSeat}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)' }}>
              Đang chọn: <strong>{selectedCount}</strong> ghế
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSelectedSeatIds(new Set())}
                disabled={selectedCount === 0 || submitting}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  cursor: selectedCount === 0 || submitting ? 'not-allowed' : 'pointer',
                  backdropFilter: 'blur(6px)'
                }}
              >
                Bỏ chọn
              </button>
              <button
                onClick={holdSeats}
                disabled={selectedCount === 0 || submitting}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(90deg,#2563eb,#7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: selectedCount === 0 || submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 24px rgba(124,58,237,0.35)',
                  transition: 'transform .12s ease, box-shadow .12s ease'
                }}
                onMouseEnter={(e) => { if (!(selectedCount === 0 || submitting)) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              >
                Giữ chỗ ({selectedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Hiển thị thông tin người dùng online và người đang giữ ghế */}
        <div style={{ 
          marginTop: 20, 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          borderRadius: 12, 
          padding: 16 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Danh sách người dùng online */}
            <div>
              <h3 style={{ 
                color: 'white', 
                fontSize: 14, 
                fontWeight: '600', 
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                👥 Người dùng online ({onlineUsers.length}/5)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {onlineUsers.map((user, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: user.socketId === currentUser?.socketId ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: user.socketId === currentUser?.socketId ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    fontSize: 12
                  }}>
                    <span style={{ 
                      width: 6, 
                      height: 6, 
                      background: '#22c55e', 
                      borderRadius: '50%',
                      display: 'inline-block'
                    }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {user.username}
                    </span>
                    {user.socketId === currentUser?.socketId && (
                      <span style={{ 
                        color: '#3b82f6', 
                        fontSize: 10, 
                        fontWeight: '500' 
                      }}>
                        (Bạn)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Danh sách ghế đang được giữ */}
            <div>
              <h3 style={{ 
                color: 'white', 
                fontSize: 14, 
                fontWeight: '600', 
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                🪑 Ghế đang được giữ
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {seats
                  .filter(seat => seat.status === 'held' && seat.holderName)
                  .map((seat, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      borderRadius: 6,
                      fontSize: 12
                    }}>
                      <span style={{ 
                        width: 6, 
                        height: 6, 
                        background: '#f59e0b', 
                        borderRadius: '50%',
                        display: 'inline-block'
                      }} />
                      <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        <strong>{seat.holderName}</strong> giữ <strong>R{seat.row + 1}C{seat.col + 1}</strong>
                      </span>
                    </div>
                  ))}
                {seats.filter(seat => seat.status === 'held' && seat.holderName).length === 0 && (
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: 12,
                    fontStyle: 'italic',
                    padding: '6px 10px'
                  }}>
                    Không có ghế nào đang được giữ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          {notifications.map((notif, idx) => (
            <div key={idx} style={{
              background: notif.type === 'success' ? '#22c55e' : '#ef4444',
              color: 'white',
              padding: '10px 16px',
              borderRadius: 8,
              marginBottom: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {notif.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ color, text }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 9999,
      padding: '6px 10px',
      color: 'rgba(255,255,255,0.9)'
    }}>
      <span style={{ width: 10, height: 10, background: color, borderRadius: 9999, display: 'inline-block', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
      <span style={{ fontSize: 12 }}>{text}</span>
    </span>
  );
}

function StatusPill({ connected }) {
  const color = connected ? '#22c55e' : '#ef4444';
  const text = connected ? 'Đã kết nối' : 'Mất kết nối';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      borderRadius: 9999,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.95)'
    }}>
      <span style={{ width: 8, height: 8, background: color, borderRadius: 9999, display: 'inline-block', boxShadow: `0 0 0 3px ${color}22` }} />
      <span style={{ fontSize: 12 }}>{text}</span>
    </span>
  );
}
