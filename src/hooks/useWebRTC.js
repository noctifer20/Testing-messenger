import { useCallback, useEffect, useRef } from "react";
import useStateWithCallBack from '../hooks/useStateWithCallBack';
import socket from "../Socket";
import ACTIONS from "../Socket/actions";

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export default function useWebRTC(roomID) {
  const [clients, updateClients] = useStateWithCallBack([]);
  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({ [LOCAL_VIDEO]: null });

  const addNewClient = useCallback((newClient, cb) => {
    updateClients(list => {
      if (!list.includes(newClient)) return [...list, newClient];
      return list;
    }, cb);
  }, [updateClients]);

  // Подключение к камере
  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
console.log('Local tracks:', localMediaStream.current.getTracks());
      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
        if (localVideoElement) {
          localVideoElement.volume = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      });

      // Только после готовности потока присоединяемся к комнате
      socket.emit(ACTIONS.JOIN, { room: roomID });
    }

    startCapture().catch(e => console.error('Error getting UserMedia', e));

    return () => {
      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach(track => track.stop());
      }
      socket.emit(ACTIONS.LEAVE);
    };
  }, [roomID, addNewClient]);

  // Добавление нового пира
  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      if (peerConnections.current[peerID]) return;

      const connection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      peerConnections.current[peerID] = connection;

      // Логи для отладки
      connection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, { peerID, iceCandidate: event.candidate });
        }
      };

      connection.oniceconnectionstatechange = () => {
        console.log(peerID, 'ICE state:', connection.iceConnectionState);
      };

      connection.onconnectionstatechange = () => {
        console.log(peerID, 'Connection state:', connection.connectionState);
      };

      connection.ontrack = ({ streams: [remoteStream] }) => {
        addNewClient(peerID, () => {
          const element = peerMediaElements.current[peerID];
          if (element) element.srcObject = remoteStream;
        });
      };

      // Отправляем локальные треки
      localMediaStream.current.getTracks().forEach(track => connection.addTrack(track, localMediaStream.current));

      if (createOffer) {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        socket.emit(ACTIONS.RELAY_SDP, { peerID, sessionDescription: offer });
      }
    }

    socket.on(ACTIONS.ADD_PEER, handleNewPeer);
    return () => socket.off(ACTIONS.ADD_PEER, handleNewPeer);
  }, [addNewClient]);

  // Получение SDP
  useEffect(() => {
    async function setRemoteMedia({ peerID, sessionDescription }) {
      const connection = peerConnections.current[peerID];
      if (!connection) return;

      try {
        await connection.setRemoteDescription(new RTCSessionDescription(sessionDescription));
      } catch (error) {
        console.error('Error setting remote description', error);
      }

      if (sessionDescription.type === 'offer') {
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        socket.emit(ACTIONS.RELAY_SDP, { peerID, sessionDescription: answer });
      }
    }

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
    return () => socket.off(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
  }, []);

  // ICE кандидаты
  useEffect(() => {
    const handleIceCandidate = ({ peerID, iceCandidate }) => {
      const connection = peerConnections.current[peerID];
      if (connection) connection.addIceCandidate(new RTCIceCandidate(iceCandidate));
    };

    socket.on(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
    return () => socket.off(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
  }, []);

  // даление пиров
  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      if (peerConnections.current[peerID]) peerConnections.current[peerID].close();
      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];
      updateClients(list => list.filter(c => c !== peerID));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
    return () => socket.off(ACTIONS.REMOVE_PEER, handleRemovePeer);
  }, [updateClients]);

  // Привязка видео к ID
  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return { clients, provideMediaRef };
}
