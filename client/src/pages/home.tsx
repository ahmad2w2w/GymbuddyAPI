import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, MapPin, ChevronDown, Sliders, Star, MessageCircle, Phone, Clock, Users, Grid, List, Search, Calendar, Send } from "lucide-react";
import EnhancedBottomNavigation from "@/components/enhanced-bottom-navigation";
import EnhancedHeader from "@/components/enhanced-header";
import BreadcrumbNavigation from "@/components/breadcrumb-navigation";
import LoadingSkeleton from "@/components/loading-skeleton";
import PullToRefresh from "@/components/pull-to-refresh";
import EnhancedUserCard from "@/components/enhanced-user-card";
import LocationFilter, { type LocationFilters } from "@/components/location-filter";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance, cn } from "@/lib/utils";
import { FaWhatsapp } from "react-icons/fa";
import type { User } from "@shared/schema";

export default function Home() {
  const [selectedFilters, setSelectedFilters] = useState(["Now Available"]);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [invitationData, setInvitationData] = useState({
    date: "",
    time: "",
    location: "",
    workoutType: "",
    message: ""
  });
  const [locationFilters, setLocationFilters] = useState<LocationFilters>({
    maxDistance: 5,
    location: "All Locations",
    timeSlot: "All Times",
    workoutType: "All Types",
    experienceLevel: "All Levels",
    availableNow: false,
  });
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const { data: availableUsers = [], isLoading } = useQuery({
    queryKey: ["/api/users", authUser?.id, "potential-matches"],
    queryFn: async () => {
      if (!authUser?.id) throw new Error("No authenticated user");
      const response = await fetch(`/api/users/${authUser.id}/potential-matches`);
      if (!response.ok) throw new Error("Failed to fetch available users");
      return response.json();
    },
    enabled: !!authUser?.id,
  });

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };



  const filteredUsers = availableUsers.filter((user: User) => {
    // Basic filters
    if (selectedFilters.includes("Now Available") && !user.availableNow) {
      return false;
    }

    // Location filter
    if (locationFilters.location !== "All Locations" && user.location !== locationFilters.location) {
      return false;
    }

    // Workout type filter
    if (locationFilters.workoutType !== "All Types" && 
        !user.preferredWorkouts?.includes(locationFilters.workoutType)) {
      return false;
    }

    // Experience level filter
    if (locationFilters.experienceLevel !== "All Levels" && 
        user.experienceLevel !== locationFilters.experienceLevel) {
      return false;
    }

    // Available now filter
    if (locationFilters.availableNow && !user.availableNow) {
      return false;
    }

    return true;
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!authUser?.id || !selectedUser) throw new Error("No authenticated user or selected user");
      
      // Combine date and time into ISO string
      const proposedDateTime = invitationData.date && invitationData.time 
        ? new Date(`${invitationData.date}T${invitationData.time}:00`).toISOString()
        : null;
      
      const response = await apiRequest("POST", "/api/invitations", {
        fromUserId: authUser.id,
        toUserId: selectedUser.id,
        message: invitationData.message || `Hoi ${selectedUser.name}! Zin om samen te trainen?`,
        proposedTime: proposedDateTime,
        location: invitationData.location || selectedUser.location,
        workoutType: invitationData.workoutType || (selectedUser.preferredWorkouts && selectedUser.preferredWorkouts[0]) || "Algemene training",
        status: "pending"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uitnodiging verstuurd!",
        description: "Je uitnodiging is verstuurd. Je hoort het als ze reageren.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", authUser?.id, "invitations"] });
      setShowInvitationDialog(false);
      setSelectedUser(null);
      setInvitationData({
        date: "",
        time: "",
        location: "",
        workoutType: "",
        message: ""
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon uitnodiging niet versturen. Probeer opnieuw.",
        variant: "destructive",
      });
    },
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

  const handleSendInvitation = (user: User) => {
    setSelectedUser(user);
    // Pre-fill form with user's preferences
    setInvitationData({
      date: "",
      time: "",
      location: user.location || "",
      workoutType: (user.preferredWorkouts && user.preferredWorkouts[0]) || "",
      message: `Hoi ${user.name}! Zin om samen te trainen?`
    });
    setShowInvitationDialog(true);
  };

  const handleSendInvitationWithDetails = () => {
    sendInvitationMutation.mutate();
  };

  // Get tomorrow's date as default
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Generate time slots
  const timeSlots = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00", "21:00"
  ];

  const workoutTypes = ["Strength", "Cardio", "Yoga", "Swimming", "Outdoor", "Boxing"];
  const locations = ["Westside Fitness", "Downtown Gym", "City Park", "Beach Workout", "Home Gym"];

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
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap bg-white text-fitness-dark border-gray-200"
            onClick={() => setShowLocationFilter(true)}
          >
            <Sliders className="w-4 h-4 mr-1" />
            Meer Filters
          </Button>
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
                        {(user.preferredWorkouts || []).slice(0, 3).map((workout: string) => (
                          <Badge key={workout} variant="secondary" className="text-xs">
                            {workout}
                          </Badge>
                        ))}
                        {(user.preferredWorkouts || []).length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(user.preferredWorkouts || []).length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-fitness-blue hover:bg-blue-600"
                          onClick={() => handleSendInvitation(user)}
                          disabled={sendInvitationMutation.isPending}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Stuur Uitnodiging
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleDirectContact(user)}
                        >
                          <FaWhatsapp className="w-4 h-4 mr-2" />
                          WhatsApp
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
        onClick={() => setShowLocationFilter(true)}
      >
        <Sliders className="w-5 h-5 text-white" />
      </Button>

      {/* Location Filter Modal */}
      {showLocationFilter && (
        <LocationFilter
          onFilterChange={setLocationFilters}
          onClose={() => setShowLocationFilter(false)}
        />
      )}

      {/* Invitation Dialog */}
      <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-fitness-blue" />
              Workout Uitnodiging
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-fitness-blue text-white rounded-full flex items-center justify-center text-lg font-semibold">
                  {selectedUser.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.location}</p>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  min={getTomorrowDate()}
                  value={invitationData.date}
                  onChange={(e) => setInvitationData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full"
                />
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label htmlFor="time">Tijd</Label>
                <Select value={invitationData.time} onValueChange={(value) => setInvitationData(prev => ({ ...prev, time: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer tijd" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label htmlFor="location">Locatie</Label>
                <Select value={invitationData.location} onValueChange={(value) => setInvitationData(prev => ({ ...prev, location: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer locatie" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Workout Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="workoutType">Workout Type</Label>
                <Select value={invitationData.workoutType} onValueChange={(value) => setInvitationData(prev => ({ ...prev, workoutType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer workout type" />
                  </SelectTrigger>
                  <SelectContent>
                    {workoutTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Bericht (optioneel)</Label>
                <Input
                  id="message"
                  value={invitationData.message}
                  onChange={(e) => setInvitationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Voeg een persoonlijk bericht toe..."
                  className="w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowInvitationDialog(false)}
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button
                  onClick={handleSendInvitationWithDetails}
                  disabled={sendInvitationMutation.isPending || !invitationData.date || !invitationData.time}
                  className="flex-1 bg-fitness-blue hover:bg-blue-600"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendInvitationMutation.isPending ? "Versturen..." : "Verstuur Uitnodiging"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <EnhancedBottomNavigation currentPage="discover" />
    </div>
  );
}
