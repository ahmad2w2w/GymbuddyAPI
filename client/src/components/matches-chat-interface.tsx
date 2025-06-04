import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Clock, CheckCheck, Circle, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTime, formatDate, getWorkoutEmoji } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Chat, WorkoutInvitation, User } from "@shared/schema";

interface MatchesChatInterfaceProps {
  match: WorkoutInvitation & {
    otherUser: User;
    fromUser?: User;
    toUser?: User;
  };
  onBack: () => void;
}

export default function MatchesChatInterface({ match, onBack }: MatchesChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { joinInvitationRoom } = useWebSocket();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = match.otherUser;

  // Join the invitation room when component mounts
  useEffect(() => {
    if (match.id) {
      joinInvitationRoom(match.id.toString());
    }
  }, [match.id, joinInvitationRoom]);

  // Get chat messages
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["/api/invitations", match.id, "chats"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/invitations/${match.id}/chats`);
      return response.json() as Promise<Chat[]>;
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest("POST", `/api/invitations/${match.id}/chats`, {
        senderId: user?.id,
        message: messageText
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      setIsTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", match.id, "chats"] });
    },
    onError: () => {
      toast({
        title: "Bericht niet verzonden",
        description: "Probeer opnieuw",
        variant: "destructive",
      });
    },
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  // Handle typing indicator
  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
      }
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 1500);
      
      setTypingTimeout(timeout);
    } else {
      setIsTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (msg: Chat, index: number) => {
    const isOwn = msg.senderId === user?.id;
    const isLastInGroup = index === chats.length - 1 || chats[index + 1]?.senderId !== msg.senderId;
    const isFirstInGroup = index === 0 || chats[index - 1]?.senderId !== msg.senderId;
    
    return (
      <div
        key={msg.id}
        className={cn(
          "flex items-end gap-2 mb-1",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        {!isOwn && isLastInGroup && (
          <Avatar className="w-8 h-8 mb-1">
            <AvatarImage src={otherUser.profileImage || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
              {otherUser.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        )}
        
        {!isOwn && !isLastInGroup && <div className="w-8" />}
        
        <div
          className={cn(
            "relative max-w-[80%] sm:max-w-[70%] px-4 py-2 shadow-sm",
            isOwn
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              : "bg-white border border-gray-100",
            isFirstInGroup && isOwn && "rounded-t-2xl rounded-bl-2xl rounded-br-md",
            isLastInGroup && isOwn && "rounded-b-2xl rounded-tl-2xl rounded-tr-md",
            !isFirstInGroup && !isLastInGroup && isOwn && "rounded-l-2xl rounded-r-md",
            isFirstInGroup && isLastInGroup && isOwn && "rounded-2xl",
            isFirstInGroup && !isOwn && "rounded-t-2xl rounded-br-2xl rounded-bl-md",
            isLastInGroup && !isOwn && "rounded-b-2xl rounded-tr-2xl rounded-tl-md",
            !isFirstInGroup && !isLastInGroup && !isOwn && "rounded-r-2xl rounded-l-md",
            isFirstInGroup && isLastInGroup && !isOwn && "rounded-2xl"
          )}
        >
          <p className="text-sm leading-relaxed">{msg.message}</p>
          {isLastInGroup && (
            <div className={cn(
              "flex items-center gap-1 mt-1 text-xs",
              isOwn ? "text-blue-100 justify-end" : "text-gray-500"
            )}>
              <Clock className="w-3 h-3" />
              <span>{formatTime(new Date(msg.sentAt || new Date()))}</span>
              {isOwn && <CheckCheck className="w-3 h-3" />}
            </div>
          )}
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Enhanced Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-white shadow-md">
              <AvatarImage src={otherUser.profileImage || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {otherUser.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-green-500 fill-current" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{otherUser.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{getWorkoutEmoji(match.workoutType || "")} {match.workoutType}</span>
              <span>•</span>
              <span>{match.location}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Match
          </Badge>
          <Button variant="ghost" size="sm" className="rounded-full">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-1 pb-4">
          {chats.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-500 text-lg mb-2">Nog geen berichten</p>
              <p className="text-gray-400 text-sm">Start het gesprek over jullie workout!</p>
            </div>
          ) : (
            chats.map((msg, index) => renderMessage(msg, index))
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-end gap-2 justify-start mb-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={otherUser.profileImage || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                  {otherUser.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
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
      </ScrollArea>

      {/* Enhanced Input Area */}
      <div className="bg-white/90 backdrop-blur-md border-t px-4 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Typ een bericht..."
              className="pr-12 py-3 rounded-full border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="sm"
            className="rounded-full w-10 h-10 p-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400"
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