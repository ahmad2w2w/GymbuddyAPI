import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Phone, Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Chat, Match, User } from "@shared/schema";

interface MatchWithUser extends Match {
  otherUser: User;
}

export default function ChatPage() {
  const { matchId } = useParams();
  const [message, setMessage] = useState("");
  const [currentUser] = useState({ id: 1 }); // Mock current user ID
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ["/api/matches", matchId, "chats"],
    queryFn: async () => {
      const response = await fetch(`/api/matches/${matchId}/chats`);
      if (!response.ok) throw new Error("Failed to fetch chats");
      return response.json() as Promise<Chat[]>;
    },
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ["/api/users", currentUser.id, "matches"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${currentUser.id}/matches`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      const matches = await response.json() as MatchWithUser[];
      return matches.find(m => m.id === parseInt(matchId || "0"));
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest("POST", "/api/chats", {
        matchId: parseInt(matchId || "0"),
        senderId: currentUser.id,
        message: messageText,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "chats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  if (chatsLoading || matchLoading) {
    return (
      <div className="min-h-screen bg-fitness-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-fitness-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-fitness-dark mb-2">Match not found</h2>
          <Link href="/matches">
            <Button>Back to Matches</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fitness-light flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center space-x-3">
        <Link href="/matches">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        
        <div 
          className="w-10 h-10 bg-cover bg-center rounded-full flex-shrink-0"
          style={{ backgroundImage: `url(${match.otherUser.profileImage})` }}
        />
        
        <div className="flex-1">
          <h2 className="font-semibold text-fitness-dark">
            {match.otherUser.name}
          </h2>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{match.otherUser.location}</span>
            {match.otherUser.availableNow && (
              <>
                <span className="mx-2">•</span>
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span className="text-green-600">Available Now</span>
              </>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (match.otherUser.whatsappNumber) {
                window.open(`https://wa.me/${match.otherUser.whatsappNumber}`, '_blank');
              }
            }}
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chats.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-fitness-dark mb-2">
              Start the conversation!
            </h3>
            <p className="text-gray-600 mb-4">
              Say hi to {match.otherUser.name} and plan your workout together.
            </p>
            <div className="bg-white rounded-lg p-4 max-w-sm mx-auto">
              <p className="text-sm text-gray-600 mb-2">Suggested messages:</p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-left justify-start"
                  onClick={() => setMessage("Hey! Ready for a great workout? 💪")}
                >
                  "Hey! Ready for a great workout? 💪"
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-left justify-start"
                  onClick={() => setMessage("What time works best for you today?")}
                >
                  "What time works best for you today?"
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {chats.map((chat) => {
              const isOwnMessage = chat.senderId === currentUser.id;
              return (
                <div
                  key={chat.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      isOwnMessage
                        ? "bg-fitness-blue text-white"
                        : "bg-white text-fitness-dark border"
                    }`}
                  >
                    <p className="text-sm">{chat.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {chat.sentAt ? new Date(chat.sentAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      {match.otherUser.availableNow && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-200">
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-green-700 border-green-300"
              onClick={() => setMessage("Are you free to workout right now?")}
            >
              Workout Now?
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-green-700 border-green-300"
              onClick={() => setMessage(`Let's meet at ${match.otherUser.location}!`)}
            >
              Meet at Gym
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form 
        onSubmit={handleSendMessage}
        className="p-4 bg-white border-t border-gray-200"
      >
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            type="submit" 
            size="sm"
            className="bg-fitness-blue hover:bg-blue-600"
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
