import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Calendar, MapPin, Star } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { Link } from "wouter";
import type { Match, User } from "@shared/schema";

interface MatchWithUser extends Match {
  otherUser: User;
}

export default function Matches() {
  const currentUser = { id: 1 }; // Mock current user ID

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["/api/users", currentUser.id, "matches"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${currentUser.id}/matches`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json() as Promise<MatchWithUser[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-fitness-light">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your matches...</p>
          </div>
        </div>
        <BottomNavigation currentPage="matches" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fitness-light">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <h1 className="text-2xl font-bold text-fitness-dark">Your Matches</h1>
        <p className="text-gray-600">Start chatting and plan your workouts!</p>
      </header>

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
                        <Link href={`/chat/${match.id}`}>
                          <Button size="sm" className="bg-fitness-green hover:bg-green-600">
                            Chat Now
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </main>

      <BottomNavigation currentPage="matches" />
    </div>
  );
}
