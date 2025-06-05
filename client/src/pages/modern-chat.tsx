import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Phone, MoreVertical, MapPin, Clock, CheckCircle2, Calendar, Smile, Paperclip, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTime, formatDate } from "@/lib/utils";
import type { WorkoutInvitation, User, Chat } from "@shared/schema";

interface InvitationWithUser extends WorkoutInvitation {
  fromUser: User;
  toUser: User;
}

export default function ModernChatPage() {
  const { invitationId } = useParams();
  const [, setLocation] = useLocation();
  const [currentUser] = useState({ id: 10 }); // Current user ID
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

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      return await apiRequest("/api/chats", "POST", {
        invitationId: parseInt(invitationId!),
        message: messageText,
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", invitationId, "chats"] });
    },
  });

  const createWorkoutSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/workout-sessions", "POST", {
        invitationId: parseInt(invitationId!),
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: invitation?.location || "Gym",
        workoutType: invitation?.workoutType || "Training",
        status: "scheduled"
      });
    },
    onSuccess: () => {
      toast({
        title: "Workout Gepland!",
        description: "Je workout sessie is succesvol gepland.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleScheduleWorkout = () => {
    createWorkoutSessionMutation.mutate();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  if (invitationLoading || chatsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Uitnodiging niet gevonden</h2>
          <Button onClick={() => setLocation("/invitations")}>
            Terug naar uitnodigingen
          </Button>
        </div>
      </div>
    );
  }

  const otherUser = invitation.fromUserId === currentUser.id ? invitation.toUser : invitation.fromUser;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Modern Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 relative">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-green-600/5"></div>
        
        <div className="relative z-10 p-4 flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/invitations")}
            className="p-2 hover:bg-blue-50 transition-colors rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </Button>
          
          <div className="flex items-center space-x-3 flex-1">
            {/* Profile with online status */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white">
                {otherUser.name?.[0]?.toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
            </div>
            
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 text-lg">{otherUser.name}</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600 font-medium">Online</span>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-500">Sportbuddy</span>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" className="p-3 hover:bg-blue-50 transition-colors rounded-full">
              <Phone className="w-5 h-5 text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="p-3 hover:bg-gray-50 transition-colors rounded-full">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* Workout Details Card */}
      {invitation && (
        <div className="bg-white border-b border-gray-100 mx-4 mt-4 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
                <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-blue-700 font-medium text-sm">{invitation.location}</span>
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                {invitation.workoutType}
              </Badge>
              {invitation.proposedTime && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{formatDate(new Date(invitation.proposedTime))}</span>
                </div>
              )}
            </div>
            
            {invitation.status === "accepted" && (
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                onClick={handleScheduleWorkout}
                disabled={createWorkoutSessionMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {createWorkoutSessionMutation.isPending ? "Plannen..." : "Bevestig Workout"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {chats.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Start jullie workout gesprek
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                Stuur een bericht om de workout details te bespreken en af te spreken
              </p>
            </div>
          ) : (
            chats.map((chat: Chat, index: number) => {
              const isOwn = chat.senderId === currentUser.id;
              const isLastInGroup = index === chats.length - 1 || chats[index + 1]?.senderId !== chat.senderId;
              const showTime = index === chats.length - 1 || 
                (new Date(chats[index + 1]?.sentAt || 0).getTime() - new Date(chat.sentAt || 0).getTime()) > 300000;
              
              return (
                <div key={chat.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
                    <div 
                      className={`
                        relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md
                        ${isOwn 
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                          : "bg-white text-gray-900 border border-gray-100"
                        }
                        ${!isLastInGroup 
                          ? (isOwn ? "rounded-br-md" : "rounded-bl-md") 
                          : ""
                        }
                        animate-fade-in
                      `}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      <p className="text-sm leading-relaxed">{chat.message}</p>
                      
                      {/* Message time and status */}
                      <div className={`flex items-center justify-end mt-2 space-x-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
                        <span className="text-xs">{formatTime(new Date(chat.sentAt || Date.now()))}</span>
                        {isOwn && (
                          <div className="flex">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      
                      {/* Message tail */}
                      <div 
                        className={`
                          absolute top-0 w-3 h-3 transform rotate-45
                          ${isOwn 
                            ? "bg-blue-500 -right-1" 
                            : "bg-white border-l border-t border-gray-100 -left-1"
                          }
                        `}
                      />
                    </div>
                    
                    {showTime && (
                      <div className={`text-xs text-gray-500 mt-1 ${isOwn ? "text-right" : "text-left"}`}>
                        {formatTime(new Date(chat.sentAt || Date.now()))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modern Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-3 hover:bg-gray-100 transition-colors rounded-full flex-shrink-0"
          >
            <Paperclip className="w-5 h-5 text-gray-500" />
          </Button>
          
          {/* Message input */}
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Typ een bericht..."
              className="pr-12 py-3 rounded-full border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 transition-colors rounded-full"
            >
              <Smile className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
          
          {/* Send/Voice button */}
          {message.trim() ? (
            <Button
              type="submit"
              disabled={sendMessageMutation.isPending}
              className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl flex-shrink-0"
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-3 hover:bg-gray-100 transition-colors rounded-full flex-shrink-0"
            >
              <Mic className="w-5 h-5 text-gray-500" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}