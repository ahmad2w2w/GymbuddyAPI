import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/utils";
import type { Chat, WorkoutInvitation, User } from "@shared/schema";

interface ChatInterfaceProps {
  invitation: WorkoutInvitation & {
    fromUser: User;
    toUser: User;
  };
  onBack: () => void;
}

export default function ChatInterface({ invitation, onBack }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { joinInvitation, sendChatMessage } = useWebSocket();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = invitation.fromUserId === user?.id ? invitation.toUser : invitation.fromUser;

  // Join the invitation room on mount
  useEffect(() => {
    joinInvitation(invitation.id.toString());
  }, [invitation.id, joinInvitation]);

  // Fetch chat messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/invitations", invitation.id, "chats"],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/${invitation.id}/chats`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json() as Promise<Chat[]>;
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest("POST", `/api/invitations/${invitation.id}/chats`, {
        senderId: user?.id,
        message: messageText
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      // Refresh messages to show the new message immediately
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", invitation.id, "chats"] });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Bericht kon niet worden verzonden. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-fitness-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chat laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fitness-light flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-fitness-blue text-white">
            {otherUser.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-semibold text-fitness-dark">{otherUser.name}</h1>
          <p className="text-sm text-gray-600">{invitation.workoutType} • {invitation.location}</p>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nog geen berichten. Start het gesprek!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.senderId === user?.id
                      ? "bg-fitness-blue text-white"
                      : "bg-white border"
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.senderId === user?.id ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {formatTime(new Date(msg.sentAt || new Date()))}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="bg-white border-t px-4 py-4">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Typ een bericht..."
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}