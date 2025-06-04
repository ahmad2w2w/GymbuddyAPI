import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, CheckCircle, XCircle, Calendar, MessageSquare, ArrowRight } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { formatTime, formatDate } from "@/lib/utils";
import { Link } from "wouter";
import type { WorkoutInvitation, User } from "@shared/schema";

interface InvitationWithUser extends WorkoutInvitation {
  fromUser?: User;
  toUser?: User;
}

export default function Invitations() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ["/api/users", authUser?.id, "invitations"],
    queryFn: async () => {
      if (!authUser?.id) throw new Error("No authenticated user");
      const response = await fetch(`/api/users/${authUser.id}/invitations`);
      if (!response.ok) throw new Error("Failed to fetch invitations");
      return response.json() as Promise<{ received: InvitationWithUser[], sent: InvitationWithUser[] }>;
    },
    enabled: !!authUser?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ invitationId, status }: { invitationId: number, status: string }) => {
      const response = await apiRequest("PUT", `/api/invitations/${invitationId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", authUser?.id, "invitations"] });
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
      description: "Ga naar Matches om te chatten.",
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
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg h-24"></div>
          ))}
        </div>
        <BottomNavigation currentPage="matches" />
      </div>
    );
  }

  const receivedInvitations = invitationsData?.received || [];
  const sentInvitations = invitationsData?.sent || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Uitnodigingen</h1>
        <p className="text-sm text-gray-600">Beheer je workout uitnodigingen</p>
      </header>

      <main className="flex-1 p-4">
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="received" className="flex items-center gap-2">
              Ontvangen ({receivedInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              Verstuurd ({sentInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4 mt-4">
            {receivedInvitations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Geen nieuwe uitnodigingen
                </h3>
                <p className="text-gray-600">
                  Workout uitnodigingen verschijnen hier
                </p>
              </div>
            ) : (
              receivedInvitations.map((invitation) => (
                <Card key={invitation.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-500">
                          {invitation.fromUser?.name?.charAt(0) || "?"}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">
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
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-500 hover:bg-green-600"
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
                          <Link href="/matches">
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Ga naar Matches
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
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
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-500">
                          {invitation.toUser?.name?.charAt(0) || "?"}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">
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
                          <Link href="/matches">
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Ga naar Matches
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
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