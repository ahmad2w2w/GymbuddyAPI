import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Calendar, MapPin, Star, Clock, Dumbbell } from "lucide-react";
import EnhancedBottomNavigation from "@/components/enhanced-bottom-navigation";
import EnhancedHeader from "@/components/enhanced-header";
import LoadingSkeleton from "@/components/loading-skeleton";
import ModernChatInterface from "@/components/modern-chat-interface";
import { Link } from "wouter";
import { formatTime, formatDate, getWorkoutEmoji } from "@/lib/utils";
import type { WorkoutInvitation, User } from "@shared/schema";

interface MatchWithUser extends WorkoutInvitation {
  otherUser: User;
}

export default function Matches() {
  const { user: authUser } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<MatchWithUser | null>(null);

  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ["/api/users", authUser?.id, "invitations"],
    queryFn: async () => {
      if (!authUser?.id) throw new Error("No authenticated user");
      const response = await fetch(`/api/users/${authUser.id}/invitations`);
      if (!response.ok) throw new Error("Failed to fetch invitations");
      const data = await response.json();
      console.log("Invitations data:", data); // Debug log
      return data;
    },
    enabled: !!authUser?.id,
  });

  // Filter for accepted invitations (matches)
  const matches = [
    ...(invitationsData?.received || []).filter(inv => inv.status === 'accepted').map(inv => ({
      ...inv,
      otherUser: inv.fromUser
    })),
    ...(invitationsData?.sent || []).filter(inv => inv.status === 'accepted').map(inv => ({
      ...inv,
      otherUser: inv.toUser
    }))
  ];

  // Show chat interface if match is selected
  if (selectedMatch) {
    // Ensure proper data structure for chat interface
    const chatInvitation = {
      ...selectedMatch,
      fromUser: selectedMatch.fromUser || selectedMatch.otherUser,
      toUser: selectedMatch.toUser || (selectedMatch.fromUserId === authUser?.id ? selectedMatch.otherUser : authUser)
    };
    
    return (
      <ModernChatInterface 
        invitation={chatInvitation as any}
        onBack={() => setSelectedMatch(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <EnhancedHeader title="Je Matches" />
        <div className="pt-4 pb-20">
          <LoadingSkeleton type="list" count={3} className="px-4" />
        </div>
        <EnhancedBottomNavigation currentPage="matches" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Enhanced Header */}
      <EnhancedHeader title="Je Matches" />

      {/* Matches List */}
      <main className="px-4 py-4 pb-24">
        {matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-fitness-dark mb-2">
              No matches yet
            </h3>
            <p className="text-gray-600 mb-6">
              Keep swiping to find your perfect workout buddy!
            </p>
            <Link href="/">
              <Button className="bg-fitness-blue hover:bg-blue-600">
                Start Discovering
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card key={match.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Profile Image */}
                    <div 
                      className="w-24 h-24 bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${match.otherUser.profileImage})` }}
                    />
                    
                    {/* Match Info */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-fitness-dark">
                            {match.otherUser.name}, {match.otherUser.age}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{match.otherUser.location}</span>
                            <span className="mx-2">•</span>
                            <span>{match.otherUser.experienceLevel}</span>
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-orange-500">
                          <Star className="w-3 h-3 mr-1" />
                          <span>{match.otherUser.rating}</span>
                        </div>
                      </div>

                      {/* Workout Preferences */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {match.otherUser.preferredWorkouts.slice(0, 3).map((workout) => (
                          <Badge key={workout} variant="secondary" className="text-xs">
                            {workout}
                          </Badge>
                        ))}
                        {match.otherUser.preferredWorkouts.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{match.otherUser.preferredWorkouts.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Link href={`/chat/${match.id}`} className="flex-1">
                          <Button size="sm" className="w-full bg-fitness-blue hover:bg-blue-600">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Chat
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            if (match.otherUser.whatsappNumber) {
                              window.open(`https://wa.me/${match.otherUser.whatsappNumber}`, '_blank');
                            }
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Active Now Section */}
        {matches.some(match => match.otherUser.availableNow) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-fitness-dark mb-4">
              Available Right Now
            </h2>
            <div className="space-y-3">
              {matches
                .filter(match => match.otherUser.availableNow)
                .map((match) => (
                  <Card key={`available-${match.id}`} className="overflow-hidden border-green-200 bg-green-50">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 bg-cover bg-center rounded-full flex-shrink-0"
                          style={{ backgroundImage: `url(${match.otherUser.profileImage})` }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-fitness-dark">
                              {match.otherUser.name}
                            </h4>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600 font-medium">
                              Available Now
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Ready for {match.otherUser.workoutDuration} workout
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedMatch(match)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat Nu
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </main>

      <EnhancedBottomNavigation currentPage="matches" />
    </div>
  );
}
