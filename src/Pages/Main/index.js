import { useEffect, useState } from 'react';
import socket from '../../Socket';
import ACTIONS from '../../Socket/actions';
import { useNavigate } from 'react-router';
import { v4 } from 'uuid';
import Logger from '../../utils/logger';

const log = Logger.withContext('Main');
export default function Main() {
  const history = useNavigate();
  const [rooms, updateRooms] = useState([]);

  useEffect(() => {
    socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
      log.info('Rooms shared', { rooms });
      updateRooms(rooms);
    });
    return () => {
      socket.off(ACTIONS.SHARE_ROOMS);
    };
  }, []);

  return (
    <div>
      <h1>Avilable rooms</h1>
      <ul>
        {rooms.map((roomId) => (
          <li key={roomId}>
            {roomId}
            <button
              onClick={() => {
                history(`/room/${roomId}`);
              }}
            >
              JOIN ROOM
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          history(`/room/${v4()}`);
        }}
      >
        Create New Room
      </button>
    </div>
  );
}
