/**
 * WebSocket helper using socket.io
 *
 * Usage:
 *   const { initWebsocket, emitVoteCasted, emitStatusChanged } = require('./utils/websocket');
 *
 */
let ioInstance = null;

function initWebsocket(server, opts = {}) {
  if (ioInstance) return ioInstance;
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: { origin: opts.origin || '*', methods: ['GET','POST'] },
    path: opts.path || '/',
  });

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    socket.on('join', ({ room }) => { if (room) socket.join(room); });
    socket.on('leave', ({ room }) => { if (room) socket.leave(room); });
    socket.on('disconnect', () => { /* noop */ });
  });

  ioInstance = io;
  return ioInstance;
}

function getIo() { if (!ioInstance) throw new Error('Websocket not initialized'); return ioInstance; }

function emitVoteCasted(electionId, payload = {}) {
  if (!ioInstance) return;
  ioInstance.to(`election-${electionId}`).emit('vote-casted', payload);
}

function emitStatusChanged(electionId, payload = {}) {
  if (!ioInstance) return;
  ioInstance.to(`election-${electionId}`).emit('status-changed', payload);
}

module.exports = { initWebsocket, getIo, emitVoteCasted, emitStatusChanged };