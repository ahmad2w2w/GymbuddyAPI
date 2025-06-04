import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, CheckCircle, XCircle, MessageCircle, Calendar } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { formatTime, formatDate } from "@/lib/utils";
import type { WorkoutInvitation, User } from "@shared/schema";

interface InvitationWithUser extends WorkoutInvitation {
  fromUser?: User;
  toUser?: User;
}

export default function Invitations() {
  const [currentUser] = useState({ id: 1 }); // Mock current user ID
  const { toast } = useToast();

  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ["/api/users", currentUser.id, "invitations"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${currentUser.id}/invitations`);
      if (!response.ok) throw new Error("Failed to fetch invitations");
      return response.json() as Promise<{ received: InvitationWithUser[], sent: InvitationWithUser[] }>;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ invitationId, status }: { invitationId: number, status: string }) => {
      const response = await apiRequest("PUT", `/api/invitations/${invitationId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "invitations"] });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = (invitationId: number) => {
    updateStatusMutation.mutate({ invitationId, status: "accepted" });
    toast({
      title: "Uitnodiging geaccepteerd!",
      description: "Je kunt nu chatten om details af te spreken.",
    });
  };

  const handleDecline = (invitationId: number) => {
    updateStatusMutation.mutate({ invitationId, status: "declined" });
    toast({
      title: "Uitnodiging afgewezen",
      description: "De uitnodiging is afgewezen.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 text-green-800";
      case "declined": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted": return "Geaccepteerd";
      case "declined": return "Afgewezen";
      default: return "Wachten op reactie";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-fitness-light">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Uitnodigingen laden...</p>
          </div>
        </div>
        <BottomNavigation currentPage="matches" />
      </div>
    );
  }

  const receivedInvitations = invitationsData?.received || [];
  const sentInvitations = invitationsData?.sent || [];

  return (
    <div className="min-h-screen bg-fitness-light">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <h1 className="text-2xl font-bold text-fitness-dark">Uitnodigingen</h1>
        <p className="text-gray-600">Beheer je workout uitnodigingen</p>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 pb-24">
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              Ontvangen ({receivedInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Verstuurd ({sentInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4 mt-4">
            {receivedInvitations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-fitness-dark mb-2">
                  Geen ontvangen uitnodigingen
                </h3>
                <p className="text-gray-600">
                  Nieuwe uitnodigingen verschijnen hier
                </p>
              </div>
            ) : (
              receivedInvitations.map((invitation) => (
                <Card key={invitation.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div 
                        className="w-16 h-16 bg-cover bg-center rounded-lg flex-shrink-0"
                        style={{ backgroundImage: `url(${invitation.fromUser?.profileImage})` }}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-fitness-dark">
                              {invitation.fromUser?.name}
                            </h3>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span>{invitation.location}</span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(invitation.status)}>
                            {getStatusText(invitation.status)}
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{invitation.workoutType}</span>
                            {invitation.proposedTime && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{formatDate(new Date(invitation.proposedTime))}</span>
                              </>
                            )}
                          </div>
                          {invitation.message && (
                            <p className="text-sm text-gray-700 italic">
                              "{invitation.message}"
                            </p>
                          )}
                        </div>

                        {invitation.status === "pending" && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              className="bg-fitness-green hover:bg-green-600"
                              onClick={() => handleAccept(invitation.id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accepteren
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDecline(invitation.id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Afwijzen
                            </Button>
                          </div>
                        )}

                        {invitation.status === "accepted" && (
                          <Button size="sm" className="bg-fitness-blue hover:bg-blue-600">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat Starten
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4 mt-4">
            {sentInvitations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-fitness-dark mb-2">
                  Geen verstuurde uitnodigingen
                </h3>
                <p className="text-gray-600">
                  Verstuurde uitnodigingen verschijnen hier
                </p>
              </div>
            ) : (
              sentInvitations.map((invitation) => (
                <Card key={invitation.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div 
                        className="w-16 h-16 bg-cover bg-center rounded-lg flex-shrink-0"
                        style={{ backgroundImage: `url(${invitation.toUser?.profileImage})` }}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-fitness-dark">
                              {invitation.toUser?.name}
                            </h3>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span>{invitation.location}</span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(invitation.status)}>
                            {getStatusText(invitation.status)}
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{invitation.workoutType}</span>
                            {invitation.proposedTime && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{formatDate(new Date(invitation.proposedTime))}</span>
                              </>
                            )}
                          </div>
                          {invitation.message && (
                            <p className="text-sm text-gray-700 italic">
                              "{invitation.message}"
                            </p>
                          )}
                        </div>

                        {invitation.status === "accepted" && (
                          <Button size="sm" className="bg-fitness-blue hover:bg-blue-600">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat Starten
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation currentPage="matches" />
    </div>
  );
}