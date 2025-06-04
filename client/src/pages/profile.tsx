import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Settings, MapPin, Clock, Trophy, Target, LogOut } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import type { InsertUser } from "@shared/schema";

const workoutTypes = ["Strength", "Cardio", "Yoga", "Swimming", "Running", "Cycling", "Boxing", "Outdoor"];
const experienceLevels = ["Beginner", "Intermediate", "Advanced"];
const timeSlots = ["Early Morning", "Morning", "Afternoon", "Evening", "Late Evening"];
const durations = ["30-45 mins", "45-60 mins", "60-90 mins", "90-120 mins", "2+ hours"];
const locations = ["Downtown Gym", "Westside Fitness", "East Coast Gym", "Central Park", "Local Gym"];

export default function Profile() {
  const [currentUser] = useState({ id: 1 });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const { toast } = useToast();
  const { logout, isLoggingOut } = useAuth();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/users", currentUser.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${currentUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      age: 25,
      bio: "",
      location: "",
      experienceLevel: "",
      preferredWorkouts: [],
      availableNow: false,
      preferredTimeSlots: [],
      workoutDuration: "",
      whatsappNumber: "",
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<InsertUser>) => {
      const response = await apiRequest("PUT", `/api/users/${currentUser.id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profiel bijgewerkt!",
        description: "Je profiel is succesvol bijgewerkt.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id] });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon profiel niet bijwerken. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  // Initialize form when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        age: user.age,
        bio: user.bio || "",
        location: user.location,
        experienceLevel: user.experienceLevel,
        preferredWorkouts: user.preferredWorkouts,
        availableNow: user.availableNow,
        preferredTimeSlots: user.preferredTimeSlots || [],
        workoutDuration: user.workoutDuration || "",
        whatsappNumber: user.whatsappNumber || "",
      });
      setSelectedWorkouts(user.preferredWorkouts || []);
      setSelectedTimeSlots(user.preferredTimeSlots || []);
    }
  }, [user, form]);

  const onSubmit = (data: InsertUser) => {
    const profileData = {
      ...data,
      preferredWorkouts: selectedWorkouts,
      preferredTimeSlots: selectedTimeSlots,
    };
    updateUserMutation.mutate(profileData);
  };

  const toggleWorkout = (workout: string) => {
    setSelectedWorkouts(prev => 
      prev.includes(workout) 
        ? prev.filter((w: string) => w !== workout)
        : [...prev, workout]
    );
  };

  const toggleTimeSlot = (timeSlot: string) => {
    setSelectedTimeSlots(prev => 
      prev.includes(timeSlot) 
        ? prev.filter((t: string) => t !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-fitness-light">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Profiel laden...</p>
          </div>
        </div>
        <BottomNavigation currentPage="profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fitness-light">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fitness-dark">Mijn Profiel</h1>
            <p className="text-gray-600">Beheer je account en voorkeuren</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {isEditing ? "Annuleren" : "Bewerken"}
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  await logout();
                  toast({
                    title: "Uitgelogd",
                    description: "Je bent succesvol uitgelogd.",
                  });
                } catch (error) {
                  toast({
                    title: "Fout",
                    description: "Uitloggen mislukt. Probeer opnieuw.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={isLoggingOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? "..." : "Uitloggen"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 pb-24">
        {!isEditing ? (
          // View Mode
          <div className="space-y-6">
            {/* Profile Overview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-20 h-20 bg-fitness-blue rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-fitness-dark">{user?.name}</h2>
                    <p className="text-gray-600">{user?.age} jaar</p>
                    <div className="flex items-center mt-2">
                      <Trophy className="w-4 h-4 text-orange-500 mr-1" />
                      <span className="text-sm text-gray-600">{user?.rating} sterren</span>
                      <span className="mx-2">•</span>
                      <span className="text-sm text-gray-600">{user?.workoutCount} workouts</span>
                    </div>
                  </div>
                  {user?.availableNow && (
                    <Badge className="bg-green-100 text-green-800">
                      Nu beschikbaar
                    </Badge>
                  )}
                </div>

                {user?.bio && (
                  <div className="mb-4">
                    <p className="text-gray-700">{user.bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{user?.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{user?.experienceLevel}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{user?.workoutDuration}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workout Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Workout Voorkeuren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-fitness-dark mb-2">Favoriete Workouts</h4>
                    <div className="flex flex-wrap gap-2">
                      {user?.preferredWorkouts?.map((workout) => (
                        <Badge key={workout} className="bg-fitness-blue text-white">
                          {workout}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-fitness-dark mb-2">Beschikbare Tijden</h4>
                    <div className="flex flex-wrap gap-2">
                      {user?.preferredTimeSlots?.map((timeSlot) => (
                        <Badge key={timeSlot} variant="outline">
                          {timeSlot}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Informatie</CardTitle>
              </CardHeader>
              <CardContent>
                {user?.whatsappNumber ? (
                  <p className="text-gray-700">WhatsApp: {user.whatsappNumber}</p>
                ) : (
                  <p className="text-gray-500 italic">Geen WhatsApp nummer ingesteld</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Edit Mode
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basis Informatie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leeftijd</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Vertel iets over jezelf en je fitness doelen..."
                            className="min-h-[80px]"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Nummer (Optioneel)</FormLabel>
                        <FormControl>
                          <Input placeholder="+31612345678" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fitness Voorkeuren</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Locatie</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer je gym/locatie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem key={location} value={location}>
                                {location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experienceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ervaring Niveau</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer je fitness niveau" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {experienceLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Favoriete Workouts</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {workoutTypes.map((workout) => (
                        <Badge
                          key={workout}
                          variant={selectedWorkouts.includes(workout) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            selectedWorkouts.includes(workout)
                              ? "bg-fitness-blue text-white"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => toggleWorkout(workout)}
                        >
                          {workout}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FormLabel>Beschikbare Tijden</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {timeSlots.map((timeSlot) => (
                        <Badge
                          key={timeSlot}
                          variant={selectedTimeSlots.includes(timeSlot) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            selectedTimeSlots.includes(timeSlot)
                              ? "bg-fitness-green text-white"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => toggleTimeSlot(timeSlot)}
                        >
                          {timeSlot}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="workoutDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workout Duur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Hoe lang train je meestal?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {durations.map((duration) => (
                              <SelectItem key={duration} value={duration}>
                                {duration}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availableNow"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Nu beschikbaar voor workout</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex space-x-4">
                <Button 
                  type="submit" 
                  className="flex-1 bg-fitness-blue hover:bg-blue-600"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Opslaan..." : "Wijzigingen Opslaan"}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Annuleren
                </Button>
              </div>
            </form>
          </Form>
        )}
      </main>

      <BottomNavigation currentPage="profile" />
    </div>
  );
}