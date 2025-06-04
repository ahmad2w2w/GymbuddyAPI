import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, MapPin, ChevronDown, Sliders, Star, Heart, X } from "lucide-react";
import UserCard from "@/components/user-card";
import BottomNavigation from "@/components/bottom-navigation";
import MatchModal from "@/components/match-modal";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function Home() {
  const [currentUser] = useState({ id: 1 }); // Mock current user ID
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [selectedFilters, setSelectedFilters] = useState(["Now Available"]);
  const { toast } = useToast();

  const { data: potentialMatches = [], isLoading } = useQuery({
    queryKey: ["/api/users", currentUser.id, "potential-matches"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${currentUser.id}/potential-matches`);
      if (!response.ok) throw new Error("Failed to fetch potential matches");
      return response.json();
    },
  });

  const createMatchMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const response = await apiRequest("POST", "/api/matches", {
        user1Id: currentUser.id,
        user2Id: targetUserId,
        status: "pending"
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.mutual) {
        setMatchedUser(potentialMatches[currentCardIndex]);
        setShowMatchModal(true);
        toast({
          title: "It's a Match!",
          description: "You both want to workout together!",
        });
      } else {
        toast({
          title: "Like sent!",
          description: "We'll notify you if they like you back.",
        });
      }
      nextCard();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send like. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentCard = potentialMatches[currentCardIndex];

  const nextCard = () => {
    if (currentCardIndex < potentialMatches.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const handleLike = () => {
    if (currentCard) {
      createMatchMutation.mutate(currentCard.id);
    }
  };

  const handlePass = () => {
    nextCard();
  };

  const handleSuperLike = () => {
    if (currentCard) {
      // For now, treat super like same as regular like
      createMatchMutation.mutate(currentCard.id);
    }
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const workoutTypes = ["Strength", "Cardio", "Yoga", "Outdoor", "Swimming"];

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
        {potentialMatches.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-fitness-dark mb-2">
              No more potential matches
            </h3>
            <p className="text-gray-600">
              Check back later or expand your preferences!
            </p>
          </div>
        ) : currentCardIndex >= potentialMatches.length ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-fitness-dark mb-2">
              You've seen everyone for now
            </h3>
            <p className="text-gray-600">
              Come back later for more workout buddies!
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Current Card */}
            <UserCard 
              user={currentCard} 
              onLike={handleLike}
              onPass={handlePass}
              onSuperLike={handleSuperLike}
            />

            {/* Action Buttons */}
            <div className="flex justify-center space-x-6 mb-6 mt-6">
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full border-2 border-gray-200 hover:border-red-300"
                onClick={handlePass}
                disabled={createMatchMutation.isPending}
              >
                <X className="w-6 h-6 text-red-500" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full border-2 border-gray-200 hover:border-orange-300"
                onClick={handleSuperLike}
                disabled={createMatchMutation.isPending}
              >
                <Star className="w-6 h-6 text-orange-500" />
              </Button>
              <Button
                size="lg"
                className="w-16 h-16 bg-fitness-green hover:bg-green-600 rounded-full"
                onClick={handleLike}
                disabled={createMatchMutation.isPending}
              >
                <Heart className="w-6 h-6 text-white" />
              </Button>
            </div>

            {/* Next Card Preview */}
            {currentCardIndex + 1 < potentialMatches.length && (
              <div className="bg-gray-100 rounded-2xl overflow-hidden -mt-6 relative z-[-1] transform scale-95">
                <div 
                  className="h-32 bg-cover bg-center"
                  style={{ backgroundImage: `url(${potentialMatches[currentCardIndex + 1].profileImage})` }}
                />
                <div className="p-3">
                  <h4 className="font-semibold text-fitness-dark">
                    {potentialMatches[currentCardIndex + 1].name}, {potentialMatches[currentCardIndex + 1].age}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {potentialMatches[currentCardIndex + 1].location} • {potentialMatches[currentCardIndex + 1].experienceLevel}
                  </p>
                </div>
              </div>
            )}
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

      {/* Match Modal */}
      {showMatchModal && matchedUser && (
        <MatchModal
          user={matchedUser}
          onClose={() => setShowMatchModal(false)}
          onStartChat={() => {
            // Navigate to chat
            setShowMatchModal(false);
          }}
          onWhatsApp={() => {
            if (matchedUser.whatsappNumber) {
              window.open(`https://wa.me/${matchedUser.whatsappNumber}`, '_blank');
            }
          }}
        />
      )}
    </div>
  );
}
