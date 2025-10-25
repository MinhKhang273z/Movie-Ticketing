import { io } from 'socket.io-client';

class SocketHandler {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.callbacks = {};
  }

  connect(url = 'http://localhost:5000') {
    if (this.socket) return;

    this.socket = io(url, { autoConnect: true });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.trigger('connect');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.trigger('disconnect');
    });

    this.socket.on('welcome', (payload) => {
      this.trigger('welcome', payload);
    });

    this.socket.on('seats', (payload) => {
      this.trigger('seats', payload);
    });

    this.socket.on('seat:update', (seat) => {
      this.trigger('seat:update', seat);
    });

    this.socket.on('seat:hold:success', (data) => {
      this.trigger('notification', { type: 'success', message: data.message || 'Giữ chỗ thành công' });
    });

    this.socket.on('seat:hold:error', (data) => {
      this.trigger('notification', { type: 'error', message: data.message || 'Lỗi khi giữ chỗ' });
    });

    this.socket.on('seat:confirm:success', (data) => {
      this.trigger('notification', { type: 'success', message: data.message || 'Xác nhận đặt chỗ thành công' });
    });

    this.socket.on('seat:confirm:error', (data) => {
      this.trigger('notification', { type: 'error', message: data.message || 'Lỗi khi xác nhận đặt chỗ' });
    });

    this.socket.on('seat:release:success', (data) => {
      this.trigger('notification', { type: 'success', message: data.message || 'Thả chỗ thành công' });
    });

    this.socket.on('seat:release:error', (data) => {
      this.trigger('notification', { type: 'error', message: data.message || 'Lỗi khi thả chỗ' });
    });

    this.socket.on('seats:update', (payload) => {
      this.trigger('seats:update', payload);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  // Gửi event
  getSeats() {
    if (this.socket) {
      this.socket.emit('seats:get');
    }
  }

  holdSeats(seatIds) {
    if (this.socket) {
      this.socket.emit('seat:hold', { seatIds });
    }
  }

  confirmSeats(seatIds) {
    if (this.socket) {
      this.socket.emit('seat:confirm', { seatIds });
    }
  }

  releaseSeats(seatIds) {
    if (this.socket) {
      this.socket.emit('seat:release', { seatIds });
    }
  }

  reserveSeats(seatIds) {
    if (this.socket) {
      this.socket.emit('seats:reserve', { seatIds });
    }
  }
}

const socketHandler = new SocketHandler();
export default socketHandler;