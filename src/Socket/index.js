import { io } from 'socket.io-client';

const socket = io(
  `${window.location.protocol}//${window.location.hostname}:3001`,
  {
    transports: ['websocket'],
  }
);

export default socket;
