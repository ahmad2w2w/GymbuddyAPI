import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Clock, CheckCheck, Circle, Phone, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { WorkoutInvitation, User, Chat } from "@shared/schema";

interface MatchesChatInterfaceProps {
  match: WorkoutInvitation & {
    otherUser: User;
    fromUser?: User;
    toUser?: User;
  };
  onBack: () => void;
}

export default function MatchesChatInterface({ match, onBack }: MatchesChatInterfaceProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { sendMessage } = useWebSocket();
  
  const otherUser = match.otherUser;

  const { data: invitation } = useQuery({
    queryKey: ["/api/invitations", match.id],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/${match.id}`);
      if (!response.ok) throw new Error("Failed to fetch invitation");
      return response.json();
    },
  });

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["/api/invitations", match.id, "chats"],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/${match.id}/chats`);
      if (!response.ok) throw new Error("Failed to fetch chats");
      return response.json() as Promise<Chat[]>;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string }) => {
      const response = await apiRequest("POST", `/api/invitations/${match.id}/chats`, messageData);
      return response.json();
    },
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", match.id, "chats"] });
      sendMessage({
        type: "new_message",
        invitationId: match.id,
        message: newMessage,
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon bericht niet verzenden. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({ message: message.trim() });
    setMessage("");
    setIsTyping(false);
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (msg: Chat, index: number) => {
    const isOwn = msg.senderId === user?.id;
    const isLastInGroup = index === chats.length - 1 || chats[index + 1]?.senderId !== msg.senderId;
    const isFirstInGroup = index === 0 || chats[index - 1]?.senderId !== msg.senderId;
    
    return (
      <div key={msg.id} className="mb-1 animate-fadeInMessage">
        {!isOwn && isFirstInGroup && (
          <div className="flex items-center gap-2 mb-2 ml-2 animate-slideInLeft">
            <Avatar className="w-7 h-7 ring-2 ring-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-semibold">
                {otherUser.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-gray-800">{otherUser.name}</span>
          </div>
        )}
        
        <div className={cn(
          "flex items-end gap-2 mb-1",
          isOwn ? "justify-end pr-1" : "justify-start pl-1"
        )}>
          <div className={cn(
            "relative max-w-[80%] px-4 py-3 shadow-lg transition-all duration-300 hover:shadow-xl backdrop-blur-sm border border-white/20 transform hover:scale-105 hover:-translate-y-0.5",
            isOwn 
              ? "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-3xl rounded-br-lg shadow-blue-500/30"
              : "bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 rounded-3xl rounded-bl-lg border-gray-200 shadow-gray-300/40"
          )}
          style={{
            filter: isOwn 
              ? "drop-shadow(0 8px 16px rgba(59, 130, 246, 0.25))" 
              : "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.08))"
          }}
          >
            <div
              className={cn(
                "absolute bottom-0 w-0 h-0 border-solid",
                isOwn
                  ? "right-0 translate-x-1 translate-y-1"
                  : "left-0 -translate-x-1 translate-y-1"
              )}
              style={{
                borderLeftWidth: isOwn ? "0" : "10px",
                borderRightWidth: isOwn ? "10px" : "0",
                borderTopWidth: "10px",
                borderBottomWidth: "0",
                borderLeftColor: isOwn ? "transparent" : "#f3f4f6",
                borderRightColor: isOwn ? "#4f46e5" : "transparent",
                borderTopColor: "transparent"
              }}
            />
            
            <p className={cn(
              "text-sm leading-relaxed font-medium break-words",
              isOwn ? "text-white" : "text-gray-800"
            )}>
              {msg.message}
            </p>
          </div>
        </div>
        
        {isLastInGroup && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs mt-1 mb-3 px-2 opacity-70 transition-opacity hover:opacity-100",
            isOwn ? "justify-end text-gray-500" : "justify-start text-gray-500"
          )}>
            <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
              <Clock className="w-3 h-3" />
              <span className="font-medium">
                {formatTime(new Date(msg.sentAt || new Date()))}
              </span>
              {isOwn && (
                <div className="flex items-center ml-1">
                  <CheckCheck className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 text-xs ml-0.5">Delivered</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chat laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
      
      <header className="relative bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-200/50 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="relative">
            <Avatar className="w-12 h-12 ring-2 ring-white shadow-lg">
              <AvatarImage src={otherUser.profileImage || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {otherUser.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <Circle className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-green-500 fill-current ring-2 ring-white" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{otherUser.name}</h2>
            <p className="text-sm text-gray-600">{match.location} • {match.workoutType}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-full hover:bg-gray-100">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full hover:bg-gray-100">
            <Video className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 py-6 relative z-10">
        <div className="pb-4">
          {chats.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-gray-500 text-lg mb-2 font-medium">Nog geen berichten</p>
              <p className="text-gray-400 text-sm">Start het gesprek over jullie workout!</p>
            </div>
          ) : (
            chats.map((msg, index) => renderMessage(msg, index))
          )}
          
          {isTyping && (
            <div className="flex justify-start mb-4 animate-fadeInMessage">
              <div className="bg-gradient-to-br from-white to-gray-100 border border-gray-200 rounded-3xl rounded-bl-lg px-5 py-4 shadow-lg">
                <div className="flex items-center space-x-1">
                  <Avatar className="w-6 h-6 mr-2">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                      {otherUser.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-typingDots"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-typingDots"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-typingDots"></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Aan het typen...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="relative bg-white/95 backdrop-blur-lg border-t border-gray-200/50 px-6 py-4 shadow-lg z-10">
        <div className="flex items-end gap-4">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Typ een bericht..."
              className={cn(
                "rounded-3xl border-2 border-gray-200/80 bg-gray-50/80 backdrop-blur-sm",
                "px-6 py-4 text-sm leading-relaxed transition-all duration-300",
                "focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:bg-white",
                "placeholder:text-gray-400 resize-none min-h-[48px]",
                message.trim() && "animate-pulseGlow"
              )}
              disabled={sendMessageMutation.isPending}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="lg"
            className={cn(
              "rounded-full w-12 h-12 p-0 shadow-lg transition-all duration-300",
              "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600",
              "hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700",
              "hover:shadow-xl hover:scale-110 active:scale-95",
              "disabled:from-gray-300 disabled:via-gray-400 disabled:to-gray-500",
              "disabled:hover:scale-100 disabled:shadow-md",
              message.trim() && !sendMessageMutation.isPending && "animate-pulseGlow"
            )}
          >
            {sendMessageMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5 transform transition-transform group-hover:translate-x-0.5" />
            )}
          </Button>
        </div>
        
        {message.trim() && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
        )}
      </div>
    </div>
  );
}