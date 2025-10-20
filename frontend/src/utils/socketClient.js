import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (opts = {}) => {
  if (socket && socket.connected) return socket;
  socket = io(window.location.origin, { path: opts.path || '/' });
  return socket;
};

export const getSocket = () => socket;