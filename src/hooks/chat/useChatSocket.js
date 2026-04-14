import { useCallback } from 'react';
import { useAppSocket, useSocketEvent } from '../../realtime/socket.provider';

export default function useChatSocket({
  enabled = true,
  onConnected,
  onMessage,
  onThreadRefresh,
  onThreadRemoved,
  onTyping,
} = {}) {
  const { emit: emitSocketEvent } = useAppSocket();

  const emit = useCallback((eventName, payload) => {
    emitSocketEvent(eventName, payload);
  }, [emitSocketEvent]);

  useSocketEvent('chat:connected', onConnected, enabled);
  useSocketEvent('chat:message:new', onMessage, enabled);
  useSocketEvent('chat:thread:refresh', onThreadRefresh, enabled);
  useSocketEvent('chat:thread:removed', onThreadRemoved, enabled);
  useSocketEvent('chat:typing', onTyping, enabled);

  return { emit };
}
