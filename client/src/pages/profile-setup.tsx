import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSetupSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ProfileSetup } from "@shared/schema";

const workoutTypes = ["Strength", "Cardio", "Yoga", "Swimming", "Running", "Cycling", "Boxing", "Outdoor"];
const experienceLevels = ["Beginner", "Intermediate", "Advanced"];
const timeSlots = ["Early Morning", "Morning", "Afternoon", "Evening", "Late Evening"];
const durations = ["30-45 mins", "45-60 mins", "60-90 mins", "90-120 mins", "2+ hours"];
const locations = ["Downtown Gym", "Westside Fitness", "East Coast Gym", "Central Park", "Local Gym"];

export default function ProfileSetup() {
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { completeProfile, isCompletingProfile } = useAuth();

  const form = useForm<ProfileSetup>({
    resolver: zodResolver(profileSetupSchema),
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

  const onSubmit = async (data: ProfileSetup) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Selected workouts:", selectedWorkouts);
    console.log("Selected time slots:", selectedTimeSlots);
    
    // Check if required workouts are selected
    if (selectedWorkouts.length === 0) {
      toast({
        title: "Fout",
        description: "Selecteer minimaal één workout type.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const profileData = {
        ...data,
        preferredWorkouts: selectedWorkouts,
        preferredTimeSlots: selectedTimeSlots,
      };
      
      console.log("Complete profile data:", profileData);
      
      await completeProfile(profileData);
      
      toast({
        title: "Profiel voltooid!",
        description: "Welkom bij FitBuddy! Laten we je trainingspartners zoeken.",
      });
      
      navigate("/");
    } catch (error: any) {
      console.error("Profile completion error:", error);
      toast({
        title: "Fout",
        description: error.message || "Profiel aanmaken mislukt. Probeer opnieuw.",
        variant: "destructive",
      });
    }
  };

  const toggleWorkout = (workout: string) => {
    setSelectedWorkouts(prev => 
      prev.includes(workout) 
        ? prev.filter(w => w !== workout)
        : [...prev, workout]
    );
  };

  const toggleTimeSlot = (timeSlot: string) => {
    setSelectedTimeSlots(prev => 
      prev.includes(timeSlot) 
        ? prev.filter(t => t !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  return (
    <div className="min-h-screen bg-fitness-light p-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-fitness-dark">
              Create Your FitBuddy Profile
            </CardTitle>
            <p className="text-gray-600">
              Let's set up your profile to find the perfect workout partners
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-fitness-dark">Basic Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
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
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="25" 
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
                            placeholder="Tell us about your fitness goals and what you're looking for in a workout buddy..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Fitness Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-fitness-dark">Fitness Preferences</h3>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your gym/location" />
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
                        <FormLabel>Experience Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your fitness level" />
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
                    <FormLabel>Preferred Workouts</FormLabel>
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
                    <FormLabel>Preferred Time Slots</FormLabel>
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
                        <FormLabel>Preferred Workout Duration</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="How long do you usually workout?" />
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
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Number (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1234567890" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availableNow"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          I'm available to workout right now
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-fitness-blue hover:bg-blue-600"
                  disabled={isCompletingProfile}
                >
                  {isCompletingProfile ? "Profiel aanmaken..." : "Profiel voltooien & Starten"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
