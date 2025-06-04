import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, MapPin, ChevronDown, Sliders, Star, MessageCircle, Phone, Clock, Users } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { FaWhatsapp } from "react-icons/fa";
import type { User } from "@shared/schema";

export default function Home() {
  const [currentUser] = useState({ id: 1 }); // Mock current user ID
  const [selectedFilters, setSelectedFilters] = useState(["Now Available"]);
  const { toast } = useToast();

  const { data: availableUsers = [], isLoading } = useQuery({
    queryKey: ["/api/users", currentUser.id, "potential-matches"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${currentUser.id}/potential-matches`);
      if (!response.ok) throw new Error("Failed to fetch available users");
      return response.json();
    },
  });

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const workoutTypes = ["Strength", "Cardio", "Yoga", "Outdoor", "Swimming"];

  const filteredUsers = availableUsers.filter((user: User) => {
    if (selectedFilters.includes("Now Available") && !user.availableNow) {
      return false;
    }
    return true;
  });

  const handleDirectContact = (user: User) => {
    if (user.whatsappNumber) {
      window.open(`https://wa.me/${user.whatsappNumber}`, '_blank');
    } else {
      toast({
        title: "Contact niet beschikbaar",
        description: "Deze gebruiker heeft geen WhatsApp nummer gedeeld.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your workout buddies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fitness-light">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          <span className="text-fitness-dark font-medium">Downtown Gym</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center space-x-3">
          <Bell className="w-5 h-5 text-gray-400" />
          <div className="w-8 h-8 bg-fitness-blue rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="px-4 py-3 bg-fitness-light">
        <div className="flex space-x-2 overflow-x-auto pb-2 filter-scroll">
          {["Now Available", ...workoutTypes].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilters.includes(filter) ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap ${
                selectedFilters.includes(filter)
                  ? "bg-fitness-blue text-white"
                  : "bg-white text-fitness-dark border-gray-200"
              }`}
              onClick={() => toggleFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 py-2 pb-24">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-fitness-dark mb-2">
              Geen beschikbare trainingspartners
            </h3>
            <p className="text-gray-600">
              Probeer later opnieuw of pas je filters aan!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user: User) => (
              <Card key={user.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Profile Image */}
                    <div 
                      className="w-24 h-24 bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${user.profileImage})` }}
                    />
                    
                    {/* User Info */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-fitness-dark flex items-center">
                            {user.name}, {user.age}
                            {user.availableNow && (
                              <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{user.location}</span>
                            <span className="mx-2">•</span>
                            <span>{user.experienceLevel}</span>
                          </div>
                          {user.availableNow && (
                            <div className="flex items-center text-sm text-green-600 mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>Nu beschikbaar</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-orange-500">
                          <Star className="w-3 h-3 mr-1" />
                          <span>{user.rating}</span>
                        </div>
                      </div>

                      {/* Bio */}
                      {user.bio && (
                        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                          {user.bio}
                        </p>
                      )}

                      {/* Workout Preferences */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {user.preferredWorkouts.slice(0, 3).map((workout) => (
                          <Badge key={workout} variant="secondary" className="text-xs">
                            {workout}
                          </Badge>
                        ))}
                        {user.preferredWorkouts.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.preferredWorkouts.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-fitness-green hover:bg-green-600"
                          onClick={() => handleDirectContact(user)}
                        >
                          <FaWhatsapp className="w-4 h-4 mr-2" />
                          Direct Contact
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Floating Filter Button */}
      <Button
        size="lg"
        className="fixed bottom-24 right-4 w-14 h-14 bg-fitness-orange hover:bg-orange-600 rounded-full shadow-lg"
      >
        <Sliders className="w-5 h-5 text-white" />
      </Button>

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="discover" />
    </div>
  );
}
