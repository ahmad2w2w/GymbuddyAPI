import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.187:3001';

interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

interface TypingEvent {
  matchId: string;
  userId: string;
}

interface MessageNotification {
  matchId: string;
  senderName: string;
  preview: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const token = api.getToken();
    
    if (!token) {
      console.log('No token, not connecting socket');
      return;
    }

    console.log('🔌 Connecting to socket...');
    
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected!');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Join a chat room
  const joinChat = useCallback((matchId: string) => {
    if (socketRef.current && isConnected) {
      // Leave previous chat if any
      if (currentChatId) {
        socketRef.current.emit('leave_chat', currentChatId);
      }
      socketRef.current.emit('join_chat', matchId);
      setCurrentChatId(matchId);
    }
  }, [isConnected, currentChatId]);

  // Leave current chat room
  const leaveChat = useCallback(() => {
    if (socketRef.current && currentChatId) {
      socketRef.current.emit('leave_chat', currentChatId);
      setCurrentChatId(null);
    }
  }, [currentChatId]);

  // Send a message
  const sendMessage = useCallback((matchId: string, text: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('send_message', { matchId, text });
    }
  }, [isConnected]);

  // Start typing indicator
  const startTyping = useCallback((matchId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_start', matchId);
    }
  }, [isConnected]);

  // Stop typing indicator
  const stopTyping = useCallback((matchId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_stop', matchId);
    }
  }, [isConnected]);

  // Listen for new messages
  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    if (socketRef.current) {
      socketRef.current.off('new_message');
      socketRef.current.on('new_message', callback);
    }
  }, []);

  // Listen for typing events
  const onUserTyping = useCallback((callback: (data: TypingEvent) => void) => {
    if (socketRef.current) {
      socketRef.current.off('user_typing');
      socketRef.current.on('user_typing', callback);
    }
  }, []);

  const onUserStoppedTyping = useCallback((callback: (data: TypingEvent) => void) => {
    if (socketRef.current) {
      socketRef.current.off('user_stopped_typing');
      socketRef.current.on('user_stopped_typing', callback);
    }
  }, []);

  // Listen for message notifications (when not in chat)
  const onMessageNotification = useCallback((callback: (data: MessageNotification) => void) => {
    if (socketRef.current) {
      socketRef.current.off('message_notification');
      socketRef.current.on('message_notification', callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping,
    onNewMessage,
    onUserTyping,
    onUserStoppedTyping,
    onMessageNotification,
  };
}
