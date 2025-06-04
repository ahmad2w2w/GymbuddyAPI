import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Phone, MoreVertical, MapPin, Clock, CheckCircle2, Check, CheckCheck } from "lucide-react";
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
  const [isTyping, setIsTyping] = useState(false);
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
        message: messageData.content,
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-between shadow-sm">
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
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto relative"
           style={{
             background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%), radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.05) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)'
           }}>
        {chats.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start het gesprek
            </h3>
            <p className="text-gray-600">
              Stuur een bericht om de workout details af te spreken
            </p>
          </div>
        ) : (
          chats.map((chat: Chat, index: number) => {
            const isOwn = chat.senderId === currentUser.id;
            const isLastInGroup = index === chats.length - 1 || chats[index + 1]?.senderId !== chat.senderId;
            const isFirstInGroup = index === 0 || chats[index - 1]?.senderId !== chat.senderId;
            
            return (
              <div key={chat.id} className="mb-1">
                <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                  {!isOwn && isLastInGroup && (
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mb-1">
                      <span className="text-white text-sm font-medium">
                        {otherUser?.name?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                  {!isOwn && !isLastInGroup && (
                    <div className="w-8 h-8 mb-1" />
                  )}
                  
                  <div
                    className={`relative max-w-[280px] px-3 py-2 shadow-sm ${
                      isOwn
                        ? `bg-blue-500 text-white mr-2 ${
                            isFirstInGroup && isLastInGroup ? "rounded-lg" :
                            isFirstInGroup ? "rounded-lg rounded-br-md" :
                            isLastInGroup ? "rounded-lg rounded-tr-md" :
                            "rounded-lg rounded-r-md"
                          }`
                        : `bg-white text-gray-900 border border-gray-100 ${
                            isFirstInGroup && isLastInGroup ? "rounded-lg" :
                            isFirstInGroup ? "rounded-lg rounded-bl-md" :
                            isLastInGroup ? "rounded-lg rounded-tl-md" :
                            "rounded-lg rounded-l-md"
                          }`
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">{chat.message}</p>
                    {isLastInGroup && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        isOwn ? "justify-end text-blue-100" : "justify-start text-gray-500"
                      }`}>
                        <span>{formatTime(new Date(chat.sentAt || Date.now()))}</span>
                        {isOwn && <CheckCheck className="w-3 h-3" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 mb-1">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mb-1">
              <span className="text-white text-sm font-medium">
                {otherUser?.name?.charAt(0) || "U"}
              </span>
            </div>
            <div className="bg-white rounded-lg rounded-bl-md px-3 py-2 shadow-sm border border-gray-100">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        {/* Quick reply suggestions */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full whitespace-nowrap bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs px-3 py-1"
            onClick={() => setMessage("Wanneer trainen?")}
          >
            Wanneer trainen?
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full whitespace-nowrap bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs px-3 py-1"
            onClick={() => setMessage("Workout duur?")}
          >
            Workout duur?
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full whitespace-nowrap bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs px-3 py-1"
            onClick={() => setMessage("Ervaring?")}
          >
            Ervaring?
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Typ een bericht..."
              className="rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white"
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={sendMessageMutation.isPending}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="sm"
            className="rounded-full w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600"
          >
            {sendMessageMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}