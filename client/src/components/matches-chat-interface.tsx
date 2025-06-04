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
      <div key={msg.id} className="mb-1">
        {/* Show avatar and name for other user's first message in group */}
        {!isOwn && isFirstInGroup && (
          <div className="flex items-center gap-2 mb-1 ml-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-purple-500 text-white text-xs">
                {otherUser.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-700">{otherUser.name}</span>
          </div>
        )}
        
        <div className={cn(
          "flex items-end gap-1 mb-1",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <div className={cn(
            "max-w-[85%] px-3 py-2",
            isOwn 
              ? "bg-blue-500 text-white rounded-2xl rounded-br-md" 
              : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md"
          )}>
            <p className="text-sm">{msg.message}</p>
          </div>
        </div>
        
        {/* Timestamp for last message in group */}
        {isLastInGroup && (
          <div className={cn(
            "flex items-center gap-1 text-xs text-gray-500 mb-2",
            isOwn ? "justify-end mr-2" : "justify-start ml-2"
          )}>
            <Clock className="w-3 h-3" />
            <span>{formatTime(new Date(msg.sentAt || new Date()))}</span>
            {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b px-4 py-4 flex items-center justify-between">
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
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="pb-4">
          {chats.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">Nog geen berichten</p>
              <p className="text-gray-400 text-sm">Start het gesprek over jullie workout!</p>
            </div>
          ) : (
            chats.map((msg, index) => renderMessage(msg, index))
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-200 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Typ een bericht..."
              className="rounded-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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