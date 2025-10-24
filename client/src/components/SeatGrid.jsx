import React from 'react';

// Component Icon SVG (Giữ nguyên)
const SeatIcon = ({ color, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={color}
    width="40px"
    height="40px"
    {...props}
  >
    <path d="M4 18v3h3v-3h10v3h3v-3h-3v-5H7v5H4zm15-8h3v3h-3v-3zM2 10h3v3H2v-3zm15 3H7V5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v8z" />
  </svg>
);

const SeatGrid = ({ seatMatrix, gridSize, selectedSeatIds, onToggleSeat }) => {

  const renderSeat = (seat) => {
    const isSelected = seat && selectedSeatIds.has(seat.id);
    const label = seat ? `${String.fromCharCode(65 + seat.row)}${seat.col + 1}` : '';
    const isAvailable = seat && seat.status === 'available';

    let seatType = 'standard';
    if (seat && seat.row >= 4) {
      seatType = 'vip';
    }
    
    // Logic bảng màu (Giữ nguyên)
    let iconColor;
    if (isSelected) {
      iconColor = '#22c55e'; // Xanh lá
    } else if (seat?.status === 'reserved') {
      iconColor = '#374151'; // Xám Tối
    } else if (seat?.status === 'held') {
      iconColor = '#f59e0b'; // Vàng Cam
    } else if (seatType === 'vip') {
      iconColor = '#8b5cf6'; // Tím VIP
    } else {
      iconColor = '#64748b'; // Xám Xanh
    }

    // --- (MỚI) Logic màu chữ (để chồng lên icon) ---
    let textColor = '#FFFFFF'; // Mặc định chữ trắng
    if (isSelected || seat?.status === 'held') {
      textColor = '#111827'; // Chữ đen cho màu Xanh/Cam
    }
    
    return (
      <button
        key={seat ? seat.id : Math.random()}
        onClick={() => seat && onToggleSeat(seat)}
        disabled={!isAvailable} 
        style={{
          // --- (CẬP NHẬT) Thêm position: 'relative' ---
          position: 'relative', // Để cho chữ nổi lên trên
          background: 'transparent',
          border: 'none',
          padding: 0,
          width: 40,
          height: 40,
          cursor: isAvailable ? 'pointer' : 'not-allowed',
          opacity: isAvailable ? 1 : 0.4,
          transform: isSelected ? 'scale(1.15)' : 'scale(1)', 
          transition: 'transform 0.1s ease, opacity 0.1s ease',
        }}
        title={seat ? `${label} - ${seat.status}` : ''}
        onMouseEnter={(e) => {
          if (isAvailable && !isSelected) e.currentTarget.style.transform = 'scale(1.15)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* --- (CẬP NHẬT) Thêm cả Icon và Chữ --- */}
        {seat ? (
          <>
            {/* 1. Icon ghế (lớp dưới) */}
            <SeatIcon color={iconColor} />
            
            {/* 2. Chữ (lớp trên) */}
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 10,
                fontWeight: 'bold',
                color: textColor, // Màu chữ đã tính toán
                pointerEvents: 'none', // Cho phép click xuyên qua
                userSelect: 'none',
                textShadow: '0 0 2px rgba(0,0,0,0.5)', // Thêm bóng mờ cho dễ đọc
              }}
            >
              {label}
            </span>
          </>
        ) : (
          <div style={{width: 40, height: 40}} /> // Ghế trống
        )}
      </button>
    );
  };

  // Phần render lưới (Giữ nguyên)
  return (
    <div style={{ padding: '6px 8px 2px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize.cols}, 40px)`, gap: 8, justifyContent: 'center' }}>
        {seatMatrix.map((row, rIdx) => (
          <div key={rIdx} style={{ display: 'contents' }}>
            {row.map((seat, cIdx) => (
              <div key={cIdx} style={{ marginRight: (cIdx === Math.floor(gridSize.cols / 2) - 1) ? 24 : 0 }}>
                {renderSeat(seat)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeatGrid;

