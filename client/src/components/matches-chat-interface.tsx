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
          "flex mb-1",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <div className={cn(
            "relative max-w-xs px-3 py-2 mx-2 rounded-lg shadow-sm",
            isOwn 
              ? "bg-green-500 text-white rounded-br-none ml-12" 
              : "bg-white text-gray-900 rounded-bl-none mr-12"
          )}>
            <p className="text-sm">{msg.message}</p>
          </div>
        </div>
        
        {isLastInGroup && (
          <div className={cn(
            "flex items-center text-xs mt-1 mb-2 px-4",
            isOwn ? "justify-end" : "justify-start"
          )}>
            <span className="text-gray-500">
              {formatTime(new Date(msg.sentAt || new Date()))}
            </span>
            {isOwn && (
              <CheckCheck className="w-4 h-4 text-blue-500 ml-1" />
            )}
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
    <div className="min-h-screen bg-gray-100 flex flex-col"
         style={{ 
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")` 
         }}
    >
      
      <header className="bg-green-600 px-4 py-3 flex items-center space-x-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-green-700 p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUser.profileImage || undefined} />
          <AvatarFallback className="bg-gray-300 text-gray-700 text-sm font-medium">
            {otherUser.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-white font-medium text-base">{otherUser.name}</h2>
          <p className="text-green-100 text-xs">online</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white hover:bg-green-700 p-2">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-green-700 p-2">
            <Phone className="w-5 h-5" />
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
            <div className="flex justify-start mb-4">
              <div className="bg-white rounded-lg rounded-bl-none px-3 py-2 mx-2 mr-12 shadow-sm">
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

      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Typ een bericht"
              className="rounded-full border border-gray-300 bg-white px-4 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500"
              disabled={sendMessageMutation.isPending}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="sm"
            className="rounded-full w-10 h-10 p-0 bg-green-600 hover:bg-green-700"
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