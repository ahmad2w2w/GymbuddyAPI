import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { formatTime, formatDate } from "@/lib/utils";
import type { WorkoutSession, WorkoutInvitation, User } from "@shared/schema";

interface WorkoutSessionWithDetails extends WorkoutSession {
  invitation: WorkoutInvitation & {
    fromUser: User;
    toUser: User;
  };
}

export default function Schedule() {
  const [currentUser] = useState({ id: 1 }); // Mock current user ID

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["/api/users", currentUser.id, "workout-sessions"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${currentUser.id}/workout-sessions`);
      if (!response.ok) throw new Error("Failed to fetch workout sessions");
      return response.json() as Promise<WorkoutSessionWithDetails[]>;
    },
  });

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-fitness-light">
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
    <div className="min-h-screen bg-fitness-light">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <h1 className="text-2xl font-bold text-fitness-dark">Mijn Schema</h1>
        <p className="text-gray-600">Overzicht van geplande en voltooide workouts</p>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 pb-24">
        {/* Upcoming Sessions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-fitness-dark mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Aankomende Workouts ({upcomingSessions.length})
          </h2>
          
          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-fitness-dark mb-2">
                  Geen geplande workouts
                </h3>
                <p className="text-gray-600 mb-4">
                  Accepteer uitnodigingen om workouts in te plannen
                </p>
                <Button className="bg-fitness-blue hover:bg-blue-600">
                  Zoek Trainingspartners
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="border-l-4 border-l-fitness-blue">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div 
                        className="w-16 h-16 bg-cover bg-center rounded-lg flex-shrink-0"
                        style={{ 
                          backgroundImage: `url(${
                            session.invitation.fromUserId === currentUser.id 
                              ? session.invitation.toUser.profileImage 
                              : session.invitation.fromUser.profileImage
                          })` 
                        }}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-fitness-dark">
                              {session.invitation.fromUserId === currentUser.id 
                                ? session.invitation.toUser.name 
                                : session.invitation.fromUser.name}
                            </h3>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span>{session.location}</span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(session.status)}>
                            {getStatusIcon(session.status)}
                            <span className="ml-1">{getStatusText(session.status)}</span>
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{session.workoutType}</span>
                            <span className="mx-2">•</span>
                            <span>{formatDate(new Date(session.scheduledTime))}</span>
                            <span className="mx-2">•</span>
                            <span>{formatTime(new Date(session.scheduledTime))}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button size="sm" className="bg-fitness-green hover:bg-green-600">
                            Check-in
                          </Button>
                          <Button size="sm" variant="outline">
                            Details
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
        <div>
          <h2 className="text-lg font-semibold text-fitness-dark mb-4 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Workout Geschiedenis ({pastSessions.length})
          </h2>
          
          {pastSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-fitness-dark mb-2">
                  Nog geen voltooide workouts
                </h3>
                <p className="text-gray-600">
                  Je workout geschiedenis verschijnt hier
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastSessions.map((session) => (
                <Card key={session.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div 
                        className="w-12 h-12 bg-cover bg-center rounded-lg flex-shrink-0"
                        style={{ 
                          backgroundImage: `url(${
                            session.invitation.fromUserId === currentUser.id 
                              ? session.invitation.toUser.profileImage 
                              : session.invitation.fromUser.profileImage
                          })` 
                        }}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-fitness-dark">
                              {session.invitation.fromUserId === currentUser.id 
                                ? session.invitation.toUser.name 
                                : session.invitation.fromUser.name}
                            </h3>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{session.workoutType}</span>
                              <span className="mx-2">•</span>
                              <span>{formatDate(new Date(session.scheduledTime))}</span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(session.status)}>
                            {getStatusIcon(session.status)}
                            <span className="ml-1">{getStatusText(session.status)}</span>
                          </Badge>
                        </div>

                        {session.status === "completed" && (
                          <Button size="sm" variant="outline">
                            Beoordeel Partner
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation currentPage="schedule" />
    </div>
  );
}