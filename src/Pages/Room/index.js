import { useParams } from 'react-router';
import useWebRTC, { LOCAL_VIDEO } from '../../hooks/useWebRTC';

export default function Room() {
  const { id } = useParams();

  const { clients, provideMediaRef } = useWebRTC(id);
  return (
    <div>
      {clients.map((clientID) => {
        return (
          <div key={clientID}>
            <video
              ref={(instance) => {
                provideMediaRef(clientID, instance);
              }}
              autoPlay
              playsInline
              muted={clientID === LOCAL_VIDEO}
            />
          </div>
        );
      })}
    </div>
  );
}
