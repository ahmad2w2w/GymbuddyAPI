import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, AlertCircle, Plus, Dumbbell, Target, Timer } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { formatTime, formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutSession, WorkoutInvitation, User } from "@shared/schema";

interface WorkoutSessionWithDetails extends WorkoutSession {
  invitation: WorkoutInvitation & {
    fromUser: User;
    toUser: User;
  };
}

export default function Schedule() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [workoutType, setWorkoutType] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [intensity, setIntensity] = useState("");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["/api/users", authUser?.id, "workout-sessions"],
    queryFn: async () => {
      if (!authUser?.id) throw new Error("No authenticated user");
      const response = await fetch(`/api/users/${authUser.id}/workout-sessions`);
      if (!response.ok) throw new Error("Failed to fetch workout sessions");
      return response.json() as Promise<WorkoutSessionWithDetails[]>;
    },
    enabled: !!authUser?.id,
  });

  const createWorkoutMutation = useMutation({
    mutationFn: async (workoutData: any) => {
      const scheduledTime = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const response = await apiRequest("POST", "/api/workout-sessions", {
        ...workoutData,
        scheduledTime,
        userId: authUser?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout Gepland!",
        description: "Je workout is succesvol toegevoegd aan je schema.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/users", authUser?.id, "workout-sessions"] });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon workout niet plannen. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime("09:00");
    setWorkoutType("");
    setLocation("");
    setDuration("60");
    setNotes("");
    setIntensity("");
  };

  const handleCreateWorkout = () => {
    if (!workoutType || !location) {
      toast({
        title: "Vereiste velden",
        description: "Vul minimaal workout type en locatie in.",
        variant: "destructive",
      });
      return;
    }

    createWorkoutMutation.mutate({
      workoutType,
      location,
      duration: parseInt(duration),
      notes,
      intensity,
      status: "scheduled",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "cancelled": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-orange-100 text-orange-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Voltooid";
      case "cancelled": return "Geannuleerd";
      default: return "Gepland";
    }
  };

  const upcomingSessions = sessions.filter(session => 
    new Date(session.scheduledTime) > new Date() && session.status === "scheduled"
  );

  const pastSessions = sessions.filter(session => 
    new Date(session.scheduledTime) <= new Date() || session.status !== "scheduled"
  );

  const getPartnerUser = (session: WorkoutSessionWithDetails) => {
    if (!session.invitation) return null;
    return session.invitation.fromUserId === authUser?.id 
      ? session.invitation.toUser 
      : session.invitation.fromUser;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Schema laden...</p>
          </div>
        </div>
        <BottomNavigation currentPage="schedule" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mijn Schema</h1>
            <p className="text-gray-600">Overzicht van geplande en voltooide workouts</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Plan Workout
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nieuwe Workout Plannen</DialogTitle>
                <DialogDescription>
                  Plan een persoonlijke workout sessie
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Datum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Tijd</Label>
                    <Input
                      id="time"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="workoutType">Workout Type</Label>
                  <Select value={workoutType} onValueChange={setWorkoutType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer workout type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Strength">Kracht Training</SelectItem>
                      <SelectItem value="Cardio">Cardio</SelectItem>
                      <SelectItem value="Yoga">Yoga</SelectItem>
                      <SelectItem value="HIIT">HIIT</SelectItem>
                      <SelectItem value="Pilates">Pilates</SelectItem>
                      <SelectItem value="CrossFit">CrossFit</SelectItem>
                      <SelectItem value="Swimming">Zwemmen</SelectItem>
                      <SelectItem value="Running">Hardlopen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Locatie</Label>
                  <Input
                    id="location"
                    placeholder="Bijv. Basic-Fit Utrecht, Vondelpark"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duur (minuten)</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                        <SelectItem value="120">120 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="intensity">Intensiteit</Label>
                    <Select value={intensity} onValueChange={setIntensity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Light">Licht</SelectItem>
                        <SelectItem value="Moderate">Gemiddeld</SelectItem>
                        <SelectItem value="Intense">Intensief</SelectItem>
                        <SelectItem value="Extreme">Extreem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notities (optioneel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Bijv. specifieke oefeningen, doelen, opmerkingen..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleCreateWorkout}
                  disabled={createWorkoutMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createWorkoutMutation.isPending ? "Bezig..." : "Plan Workout"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{upcomingSessions.length}</div>
              <p className="text-sm text-gray-600">Gepland</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {pastSessions.filter(s => s.status === "completed").length}
              </div>
              <p className="text-sm text-gray-600">Voltooid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
              <p className="text-sm text-gray-600">Totaal</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Aankomende Workouts ({upcomingSessions.length})
          </h2>
          
          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Geen geplande workouts
                </h3>
                <p className="text-gray-600 mb-4">
                  Plan een nieuwe workout of accepteer uitnodigingen
                </p>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Plan Workout
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-8 h-8 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {session.workoutType}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {getPartnerUser(session)?.name && (
                                <>Met {getPartnerUser(session)?.name}</>
                              )}
                            </p>
                          </div>
                          <Badge className={getStatusColor(session.status)}>
                            {getStatusIcon(session.status)}
                            <span className="ml-1">{getStatusText(session.status)}</span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(new Date(session.scheduledTime))} om {formatTime(new Date(session.scheduledTime))}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {session.location}
                          </div>
                          <div className="flex items-center">
                            <Timer className="w-4 h-4 mr-1" />
                            {session.duration || 60} minuten
                          </div>
                          <div className="flex items-center">
                            <Target className="w-4 h-4 mr-1" />
                            {session.intensity || "Gemiddeld"}
                          </div>
                        </div>

                        {session.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{session.notes}</p>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline">
                            Bewerken
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            Annuleren
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
              Workout Geschiedenis ({pastSessions.length})
            </h2>
            
            <div className="space-y-4">
              {pastSessions.slice(0, 5).map((session) => (
                <Card key={session.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{session.workoutType}</h3>
                            <p className="text-sm text-gray-600">
                              {formatDate(new Date(session.scheduledTime))} • {session.location}
                            </p>
                          </div>
                          <Badge className={getStatusColor(session.status)}>
                            {getStatusIcon(session.status)}
                            <span className="ml-1">{getStatusText(session.status)}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNavigation currentPage="schedule" />
    </div>
  );
}