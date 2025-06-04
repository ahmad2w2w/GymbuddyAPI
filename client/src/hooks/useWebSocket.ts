import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      // Authenticate with the server
      ws.current?.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case 'invitation_status_updated':
            // Refresh invitations when status changes
            queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "invitations"] });
            queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "potential-matches"] });
            break;
            
          case 'new_message':
            // Refresh chat when new message arrives
            queryClient.invalidateQueries({ queryKey: ["/api/invitations", data.invitationId, "chats"] });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.current?.close();
    };
  }, [user?.id]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  const joinInvitation = (invitationId: string) => {
    sendMessage({
      type: 'join_invitation',
      invitationId
    });
  };

  const sendChatMessage = (invitationId: string, message: string, senderId: number) => {
    sendMessage({
      type: 'send_message',
      invitationId,
      message,
      senderId
    });
  };

  return {
    isConnected,
    sendMessage,
    joinInvitation,
    sendChatMessage
  };
}