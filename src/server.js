const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('../src/Socket/actions');
const { version, validate } = require('uuid');
const { default: Logger } = require('../src/utils/logger');
const app = express();
app.use(cors());

const log = Logger.withContext('server');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '192.168.1.204:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

function getClientRooms() {
  const { rooms } = io.sockets.adapter;
  return Array.from(rooms.keys()).filter(
    (roomID) => validate(roomID) && version(roomID) === 4
  );
}

function shareRoomsInfo() {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms(),
  });
}

io.on('connection', (socket) => {
  log.info('User connected:', socket.id);
  shareRoomsInfo();

  socket.on(ACTIONS.JOIN, (config) => {
    const { id } = config;
    log.info('join room', {
      id,
      userId: socket.id,
    });
    socket.join(id);
    shareRoomsInfo();

    const clients = Array.from(io.sockets.adapter.rooms.get(id) || []);
    log.info('clients', {
      clients,
    });
    clients.forEach((clientID) => {
      io.to(clientID).emit(ACTIONS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false,
      });

      socket.emit(ACTIONS.ADD_PEER, {
        peerID: clientID,
        createOffer: true,
      });
    });
  });

  function leaveRoom() {
    const { rooms } = socket;

    Array.from(rooms).forEach((roomID) => {
      const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

      clients.forEach((clientID) => {
        io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
          peerID: socket.id,
        });

        socket.emit(ACTIONS.REMOVE_PEER, {
          peerID: clientID,
        });
      });

      socket.leave(roomID);
    });

    shareRoomsInfo();
  }

  socket.on(ACTIONS.LEAVE, leaveRoom);
  socket.on('disconnecting', leaveRoom);

  socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
    io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    });
  });

  socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
    io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
});
