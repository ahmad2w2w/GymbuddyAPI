import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Phone, MoreVertical, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTime, formatDate } from "@/lib/utils";
import type { WorkoutInvitation, User, Chat } from "@shared/schema";

interface InvitationWithUser extends WorkoutInvitation {
  fromUser: User;
  toUser: User;
}

export default function ChatPage() {
  const { invitationId } = useParams();
  const [, setLocation] = useLocation();
  const [currentUser] = useState({ id: 1 }); // Mock current user ID
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: invitation, isLoading: invitationLoading } = useQuery({
    queryKey: ["/api/invitations", invitationId],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/${invitationId}`);
      if (!response.ok) throw new Error("Failed to fetch invitation");
      return response.json() as Promise<InvitationWithUser>;
    },
  });

  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ["/api/invitations", invitationId, "chats"],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/${invitationId}/chats`);
      if (!response.ok) throw new Error("Failed to fetch chats");
      return response.json();
    },
  });

  // WebSocket connection for real-time chat
  useEffect(() => {
    if (!invitationId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      // Join the invitation room
      ws.send(JSON.stringify({
        type: "join_invitation",
        invitationId: invitationId,
        userId: currentUser.id
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message" && data.invitationId === invitationId) {
        // Invalidate chat query to refetch messages
        queryClient.invalidateQueries({ queryKey: ["/api/invitations", invitationId, "chats"] });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
      toast({
        title: "Verbindingsfout",
        description: "Kon geen real-time verbinding maken. Berichten worden mogelijk vertraagd.",
        variant: "destructive",
      });
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [invitationId, currentUser.id, toast]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string }) => {
      const response = await apiRequest("POST", `/api/invitations/${invitationId}/chats`, {
        senderId: currentUser.id,
        content: messageData.content,
      });
      return response.json();
    },
    onSuccess: (newMessage) => {
      setMessage("");
      // Send real-time update via WebSocket
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "send_message",
          invitationId: invitationId,
          message: newMessage
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", invitationId, "chats"] });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon bericht niet verzenden. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  const createWorkoutSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/workout-sessions", {
        invitationId: parseInt(invitationId!),
        location: invitation?.location,
        workoutType: invitation?.workoutType,
        scheduledTime: invitation?.proposedTime || new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout Gepland!",
        description: "Je workout is toegevoegd aan je schema.",
      });
      setLocation("/schedule");
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon workout niet plannen. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate({ content: message.trim() });
    }
  };

  const handleScheduleWorkout = () => {
    createWorkoutSessionMutation.mutate();
  };

  const goBack = () => {
    setLocation("/invitations");
  };

  if (invitationLoading || chatsLoading) {
    return (
      <div className="min-h-screen bg-fitness-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chat laden...</p>
        </div>
      </div>
    );
  }

  const otherUser = invitation?.fromUserId === currentUser.id ? invitation?.toUser : invitation?.fromUser;

  return (
    <div className="min-h-screen bg-fitness-light flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div 
            className="w-10 h-10 bg-cover bg-center rounded-full bg-fitness-blue flex items-center justify-center"
            style={{ backgroundImage: otherUser?.profileImage ? `url(${otherUser.profileImage})` : undefined }}
          >
            {!otherUser?.profileImage && (
              <span className="text-white font-medium">
                {otherUser?.name?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-fitness-dark">{otherUser?.name}</h2>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
              <p className="text-sm text-gray-600">
                {isConnected ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Invitation Details */}
      {invitation && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{invitation.location}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>{invitation.workoutType}</span>
              </div>
              {invitation.proposedTime && (
                <div className="flex items-center text-sm text-gray-600">
                  <span>{formatDate(new Date(invitation.proposedTime))}</span>
                </div>
              )}
            </div>
            {invitation.status === "accepted" && (
              <Button 
                size="sm" 
                className="bg-fitness-green hover:bg-green-600"
                onClick={handleScheduleWorkout}
                disabled={createWorkoutSessionMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Plan Workout
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-fitness-dark mb-2">
              Start het gesprek
            </h3>
            <p className="text-gray-600">
              Stuur een bericht om de workout details af te spreken
            </p>
          </div>
        ) : (
          chats.map((chat: Chat) => (
            <div
              key={chat.id}
              className={`flex ${chat.senderId === currentUser.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  chat.senderId === currentUser.id
                    ? "bg-fitness-blue text-white"
                    : "bg-white text-fitness-dark border border-gray-200"
                }`}
              >
                <p>{chat.content}</p>
                <p className={`text-xs mt-1 ${
                  chat.senderId === currentUser.id ? "text-blue-100" : "text-gray-500"
                }`}>
                  {formatTime(new Date(chat.createdAt))}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 px-4 py-2">
        <div className="flex space-x-2 overflow-x-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="whitespace-nowrap"
            onClick={() => setMessage("Wanneer wil je trainen?")}
          >
            Wanneer trainen?
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="whitespace-nowrap"
            onClick={() => setMessage("Hoe lang duurt je workout meestal?")}
          >
            Workout duur?
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="whitespace-nowrap"
            onClick={() => setMessage("Wat is je ervaring niveau?")}
          >
            Ervaring?
          </Button>
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type een bericht..."
            className="flex-1"
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-fitness-blue hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}