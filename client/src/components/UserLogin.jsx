import { useState } from 'react';

export default function UserLogin({ onLogin, isConnected }) {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !isConnected) return;
    
    setIsSubmitting(true);
    try {
      await onLogin(username.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: 20
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 40,
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: 400
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{
            color: 'white',
            fontSize: 28,
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}>
            Movie Ticketing
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 14,
            margin: 0
          }}>
            Đăng nhập để chọn ghế
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 14,
              fontWeight: '500',
              marginBottom: 8
            }}>
              Tên người dùng
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên của bạn"
              disabled={!isConnected || isSubmitting}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                color: 'white',
                fontSize: 16,
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!username.trim() || !isConnected || isSubmitting}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: !username.trim() || !isConnected || isSubmitting 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: '600',
              cursor: !username.trim() || !isConnected || isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: !username.trim() || !isConnected || isSubmitting 
                ? 'none' 
                : '0 10px 25px rgba(59, 130, 246, 0.3)',
              opacity: !username.trim() || !isConnected || isSubmitting ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!(!username.trim() || !isConnected || isSubmitting)) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 35px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'none';
              e.target.style.boxShadow = !username.trim() || !isConnected || isSubmitting 
                ? 'none' 
                : '0 10px 25px rgba(59, 130, 246, 0.3)';
            }}
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {!isConnected && (
          <div style={{
            marginTop: 20,
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 8,
            color: '#fca5a5',
            fontSize: 14,
            textAlign: 'center'
          }}>
            ⚠️ Không thể kết nối đến server
          </div>
        )}

        <div style={{
          marginTop: 20,
          padding: 12,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 8,
          color: '#93c5fd',
          fontSize: 12,
          textAlign: 'center'
        }}>
          💡 Tối đa 5 người có thể online cùng lúc
        </div>
      </div>
    </div>
  );
}
