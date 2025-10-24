import SeatGrid from './components/SeatGrid'; // <-- Đã import (TV3)
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', { autoConnect: true });

// XÓA STATUS_COLOR (đã chuyển sang SeatGrid.jsx)

export default function App() {
  const [connected, setConnected] = useState(false);
  const [welcome, setWelcome] = useState('');
  const [seats, setSeats] = useState([]); // { id, row, col, status }
  const [selectedSeatIds, setSelectedSeatIds] = useState(new Set());
  const [gridSize, setGridSize] = useState({ rows: 8, cols: 12 });
  const [submitting, setSubmitting] = useState(false);

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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('welcome', onWelcome);
    socket.on('seats', onSeats);
    socket.on('seat:update', onSeatUpdate);

    // Yêu cầu server gửi snapshot ghế ban đầu
    socket.emit('seats:get');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('welcome', onWelcome);
      socket.off('seats', onSeats);
      socket.off('seat:update', onSeatUpdate);
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

  const confirmSelection = async () => {
    if (selectedSeatIds.size === 0) return;
    setSubmitting(true);
    try {
      const ids = Array.from(selectedSeatIds);
      socket.emit('seats:reserve', { seatIds: ids });
    } finally {
      setSubmitting(false);
    }
  };

  // XÓA HÀM renderSeat (đã chuyển sang SeatGrid.jsx)

  const selectedCount = selectedSeatIds.size;

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
            </div>
          </div>
         
<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
  <Badge color="#64748b" text="Thường" />
  <Badge color="#8b5cf6" text="VIP" />
  <Badge color="#374151" text="Đã đặt" />
  <Badge color="#f59e0b" text="Giữ chỗ" />
  <Badge color="#22c55e" text="Đang chọn" />
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
                onClick={confirmSelection}
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
                Xác nhận ({selectedCount})
              </button>
            </div>
          </div>
        </div>
      </div>
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
