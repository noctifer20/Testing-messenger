import { useCallback, useEffect, useMemo, useRef } from 'react';
import useStateWithCallBack from '../hooks/useStateWithCallBack';
import socket from '../Socket';
import ACTIONS from '../Socket/actions';
import Logger from '../utils/logger';

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

const log = Logger.withContext('useWebRTC');
export default function useWebRTC(id) {
  const [clients, updateClients] = useStateWithCallBack([]);
  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({ [LOCAL_VIDEO]: null });

  const addNewClient = useCallback(
    (newClient, cb) => {
      updateClients((list) => {
        if (!list.includes(newClient)) return [...list, newClient];
        return list;
      }, cb);
    },
    [updateClients]
  );

  // Подключение к камере
  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      log.debug('Local tracks:', localMediaStream.current.getTracks());
      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
        if (localVideoElement) {
          localVideoElement.volume = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      });

      // Только после готовности потока присоединяемся к комнате
      log.info('Joining room:', id);
      socket.emit(ACTIONS.JOIN, { id });
    }

    startCapture().catch((e) => log.error('Error getting UserMedia', e));

    return () => {
      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach((track) => track.stop());
      }
      log.info('leave room', { id });
      socket.emit(ACTIONS.LEAVE);
    };
  }, [id, addNewClient]);

  // Добавление нового пира
  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      log.info('peer connections', peerConnections.current);
      if (peerConnections.current[peerID]) {
        log.warn(`Peer ${peerID} already exists`);
        return;
      }

      log.info(`Adding new peer: ${peerID}`, { createOffer });
      const connection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnections.current[peerID] = connection;

      // Логи для отладки
      connection.onicecandidate = (event) => {
        log.debug('ICE candidate', { peerID, event });
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      connection.oniceconnectionstatechange = () => {
        log.debug(
          `ICE state changed for ${peerID}:`,
          connection.iceConnectionState
        );
        if (connection.iceConnectionState === 'failed') {
          log.warn(`ICE connection failed for peer: ${peerID}`);
        }
      };

      connection.onconnectionstatechange = () => {
        log.debug(
          `Connection state changed for ${peerID}:`,
          connection.connectionState
        );
        if (connection.connectionState === 'failed') {
          log.error(`Connection failed for peer: ${peerID}`);
        }
      };

      connection.ontrack = ({ streams: [remoteStream] }) => {
        addNewClient(peerID, () => {
          const element = peerMediaElements.current[peerID];
          if (element) element.srcObject = remoteStream;
        });
      };

      // Отправляем локальные треки
      localMediaStream.current
        .getTracks()
        .forEach((track) =>
          connection.addTrack(track, localMediaStream.current)
        );

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
        await connection.setRemoteDescription(
          new RTCSessionDescription(sessionDescription)
        );
        log.debug(
          `Set remote description for ${peerID}:`,
          sessionDescription.type
        );
      } catch (error) {
        log.error('Error setting remote description', { peerID, error });
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
      if (connection)
        connection.addIceCandidate(new RTCIceCandidate(iceCandidate));
    };

    socket.on(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
    return () => socket.off(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
  }, []);

  // Удаление пиров
  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      log.info(`Removing peer: ${peerID}`);
      if (peerConnections.current[peerID])
        peerConnections.current[peerID].close();
      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];
      updateClients((list) => list.filter((c) => c !== peerID));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
    return () => socket.off(ACTIONS.REMOVE_PEER, handleRemovePeer);
  }, [updateClients, log]);

  // Привязка видео к ID
  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return { clients, provideMediaRef };
}
