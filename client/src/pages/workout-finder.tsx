import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Clock, Users, Star, MessageCircle, Calendar } from "lucide-react";
import EnhancedHeader from "@/components/enhanced-header";
import EnhancedBottomNavigation from "@/components/enhanced-bottom-navigation";
import { calculateDistance, formatTime } from "@/lib/utils";
import type { User } from "@shared/schema";

interface WorkoutSearch {
  date: string;
  time: string;
  location: string;
  workoutType: string;
  experienceLevel: string;
  maxDistance: number;
}

export default function WorkoutFinder() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [searchParams, setSearchParams] = useState<WorkoutSearch>({
    date: new Date().toISOString().split('T')[0],
    time: "18:00",
    location: "Westside Fitness",
    workoutType: "Strength",
    experienceLevel: "Intermediate",
    maxDistance: 10
  });
  
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "experience">("distance");

  const { data: searchResults = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/users/search-workout-partners", searchParams],
    queryFn: async () => {
      if (!hasSearched) return [];
      
      const queryString = new URLSearchParams({
        date: searchParams.date,
        time: searchParams.time,
        location: searchParams.location,
        workoutType: searchParams.workoutType,
        experienceLevel: searchParams.experienceLevel,
        maxDistance: searchParams.maxDistance.toString()
      }).toString();
      
      const response = await fetch(`/api/users/search-workout-partners?${queryString}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: hasSearched
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (targetUser: User) => {
      const scheduledDateTime = new Date(`${searchParams.date}T${searchParams.time}`);
      
      return await apiRequest("/api/workout-invitations", "POST", {
        toUserId: targetUser.id,
        message: `Hoi ${targetUser.name}! Zin om samen te trainen op ${scheduledDateTime.toLocaleDateString()} om ${searchParams.time}?`,
        proposedTime: scheduledDateTime.toISOString(),
        location: searchParams.location,
        workoutType: searchParams.workoutType,
        status: "pending"
      });
    },
    onSuccess: (_, targetUser) => {
      toast({
        title: "Uitnodiging verstuurd!",
        description: `Je training-verzoek naar ${targetUser.name} is verstuurd.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon uitnodiging niet versturen. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setHasSearched(true);
    refetch();
  };

  const handleSendInvitation = (user: User) => {
    sendInvitationMutation.mutate(user);
  };

  const sortedResults = [...searchResults].sort((a, b) => {
    switch (sortBy) {
      case "distance":
        const distanceA = calculateDistance(
          52.3676, 4.9041, // Default Amsterdam coordinates
          a.latitude || 0, a.longitude || 0
        );
        const distanceB = calculateDistance(
          52.3676, 4.9041, // Default Amsterdam coordinates
          b.latitude || 0, b.longitude || 0
        );
        return distanceA - distanceB;
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "experience":
        const experienceOrder = ["Beginner", "Intermediate", "Advanced", "Expert"];
        return experienceOrder.indexOf(b.experienceLevel || "") - experienceOrder.indexOf(a.experienceLevel || "");
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <EnhancedHeader title="Vind Trainingspartner" showSearch={false} />
      
      {/* Search Form */}
      <div className="bg-white shadow-sm border-b p-4 space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Zoek direct een trainingspartner</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date and Time */}
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input
              id="date"
              type="date"
              value={searchParams.date}
              onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="time">Tijd</Label>
            <Input
              id="time"
              type="time"
              value={searchParams.time}
              onChange={(e) => setSearchParams(prev => ({ ...prev, time: e.target.value }))}
            />
          </div>
          
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Locatie / Gym</Label>
            <Select 
              value={searchParams.location} 
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, location: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer locatie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Westside Fitness">Westside Fitness</SelectItem>
                <SelectItem value="Basic-Fit">Basic-Fit</SelectItem>
                <SelectItem value="SportCity">SportCity</SelectItem>
                <SelectItem value="David Lloyd">David Lloyd</SelectItem>
                <SelectItem value="Outdoor Park">Outdoor Park</SelectItem>
                <SelectItem value="Home Gym">Home Gym</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Workout Type */}
          <div className="space-y-2">
            <Label htmlFor="workoutType">Trainingsvorm</Label>
            <Select 
              value={searchParams.workoutType} 
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, workoutType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer training" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Strength">Krachttraining</SelectItem>
                <SelectItem value="Cardio">Cardio</SelectItem>
                <SelectItem value="HIIT">HIIT</SelectItem>
                <SelectItem value="Yoga">Yoga</SelectItem>
                <SelectItem value="CrossFit">CrossFit</SelectItem>
                <SelectItem value="Boxing">Boksen</SelectItem>
                <SelectItem value="Running">Hardlopen</SelectItem>
                <SelectItem value="Swimming">Zwemmen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Experience Level */}
          <div className="space-y-2">
            <Label htmlFor="experience">Niveau</Label>
            <Select 
              value={searchParams.experienceLevel} 
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, experienceLevel: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Gemiddeld</SelectItem>
                <SelectItem value="Advanced">Gevorderd</SelectItem>
                <SelectItem value="Expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Distance */}
          <div className="space-y-2">
            <Label htmlFor="distance">Max. afstand (km)</Label>
            <Select 
              value={searchParams.maxDistance.toString()} 
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, maxDistance: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer afstand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 km</SelectItem>
                <SelectItem value="10">10 km</SelectItem>
                <SelectItem value="15">15 km</SelectItem>
                <SelectItem value="25">25 km</SelectItem>
                <SelectItem value="50">50 km</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          onClick={handleSearch}
          className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? "Zoeken..." : "Zoek Trainingspartners"}
        </Button>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="p-4">
          {/* Sort Options */}
          {searchResults.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {searchResults.length} partner{searchResults.length !== 1 ? 's' : ''} gevonden
              </p>
              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Afstand</SelectItem>
                  <SelectItem value="rating">Beoordeling</SelectItem>
                  <SelectItem value="experience">Ervaring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Results List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Zoeken naar partners...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Geen partners gevonden
                </h3>
                <p className="text-gray-600 mb-4">
                  Probeer andere zoekparameters of een ander tijdstip
                </p>
                <Button variant="outline" onClick={() => setHasSearched(false)}>
                  Nieuwe zoekopdracht
                </Button>
              </div>
            ) : (
              sortedResults.map((user: User) => (
                <Card key={user.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Profile Image */}
                      <div 
                        className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-xl"
                      >
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center">
                              {user.name}, {user.age}
                              <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
                            </h3>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span>{user.location}</span>
                              <span className="mx-2">•</span>
                              <span>
                                {calculateDistance(
                                  currentUser?.latitude || 0,
                                  currentUser?.longitude || 0,
                                  user.latitude || 0,
                                  user.longitude || 0
                                ).toFixed(1)} km
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-orange-500">
                            <Star className="w-3 h-3 mr-1" />
                            <span>{user.rating}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {user.experienceLevel}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {searchParams.workoutType}
                          </Badge>
                        </div>

                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => setLocation(`/profile/${user.id}`)}
                            variant="outline"
                            className="flex-1"
                          >
                            Bekijk Profiel
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
                            onClick={() => handleSendInvitation(user)}
                            disabled={sendInvitationMutation.isPending}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            {sendInvitationMutation.isPending ? "Versturen..." : "Uitnodigen"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
      
      <EnhancedBottomNavigation currentPage="discover" />
    </div>
  );
}