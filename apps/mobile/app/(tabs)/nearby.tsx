import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, ScrollView } from 'react-native';
import { Text, Button, useTheme, Card, Chip, IconButton, SegmentedButtons, ActivityIndicator, Portal, Modal, Badge, Avatar, Divider, TextInput, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { api, Session, JoinRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getLabel, WORKOUT_TYPES, INTENSITIES, LEVELS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Session status helper
type SessionStatus = 'upcoming' | 'ongoing' | 'past';

const getSessionStatus = (session: Session): SessionStatus => {
  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(start.getTime() + session.durationMinutes * 60 * 1000);
  
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  return 'past';
};

export default function NearbyScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  // Main tab: 'nearby' or 'mine'
  const [mainTab, setMainTab] = useState<'nearby' | 'mine'>('nearby');
  
  // Nearby sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);

  // My sessions state
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [handlingRequest, setHandlingRequest] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  
  // My session actions state
  const [selectedMySession, setSelectedMySession] = useState<Session | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<{ title: string; notes: string }>({ title: '', notes: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      let lat = user?.lat;
      let lng = user?.lng;

      if (!lat || !lng) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      }

      if (lat && lng) {
        setLocation({ lat, lng });
      }

      const response = await api.getNearbySessions({
        lat: lat || 52.3676,
        lng: lng || 4.9041,
        radiusKm: user?.preferredRadius || 15,
      });

      if (response.success) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Load sessions error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (mainTab === 'nearby') {
      loadSessions();
    } else {
      loadMySessions();
    }
  }, [loadSessions, mainTab]);

  const loadMySessions = useCallback(async () => {
    try {
      setLoadingMine(true);
      const response = await api.getMySessions();
      if (response.success) {
        setMySessions(response.data);
      }
    } catch (error) {
      console.error('Load my sessions error:', error);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  const handleAcceptRequest = async (sessionId: string, requestId: string) => {
    try {
      setHandlingRequest(requestId);
      await api.handleJoinRequest(sessionId, requestId, 'accept');
      Alert.alert('Geaccepteerd!', 'De aanvraag is geaccepteerd.');
      loadMySessions();
    } catch (error) {
      console.error('Accept request error:', error);
      Alert.alert('Fout', 'Kon aanvraag niet accepteren.');
    } finally {
      setHandlingRequest(null);
    }
  };

  const handleDeclineRequest = async (sessionId: string, requestId: string) => {
    try {
      setHandlingRequest(requestId);
      await api.handleJoinRequest(sessionId, requestId, 'decline');
      Alert.alert('Afgewezen', 'De aanvraag is afgewezen.');
      loadMySessions();
    } catch (error) {
      console.error('Decline request error:', error);
      Alert.alert('Fout', 'Kon aanvraag niet afwijzen.');
    } finally {
      setHandlingRequest(null);
    }
  };

  const handleDeleteSession = (session: Session) => {
    Alert.alert(
      'Sessie verwijderen',
      `Weet je zeker dat je "${session.title}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.deleteSession(session.id);
              Alert.alert('Verwijderd', 'De sessie is verwijderd.');
              setSelectedMySession(null);
              loadMySessions();
            } catch (error) {
              console.error('Delete session error:', error);
              Alert.alert('Fout', 'Kon sessie niet verwijderen.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditSession = async () => {
    if (!selectedMySession) return;
    
    try {
      setActionLoading(true);
      await api.updateSession(selectedMySession.id, {
        title: editData.title,
        notes: editData.notes || null,
      });
      Alert.alert('Opgeslagen', 'De sessie is bijgewerkt.');
      setShowEditModal(false);
      loadMySessions();
    } catch (error) {
      console.error('Edit session error:', error);
      Alert.alert('Fout', 'Kon sessie niet bijwerken.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveParticipant = (session: Session, request: JoinRequest) => {
    Alert.alert(
      'Deelnemer verwijderen',
      `Weet je zeker dat je ${request.requester?.name} wilt verwijderen uit de sessie?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            try {
              setHandlingRequest(request.id);
              await api.removeParticipant(session.id, request.id);
              Alert.alert('Verwijderd', 'De deelnemer is verwijderd.');
              loadMySessions();
            } catch (error) {
              console.error('Remove participant error:', error);
              Alert.alert('Fout', 'Kon deelnemer niet verwijderen.');
            } finally {
              setHandlingRequest(null);
            }
          },
        },
      ]
    );
  };

  const handleDuplicateSession = async (session: Session) => {
    try {
      setActionLoading(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(new Date(session.startTime).getHours());
      tomorrow.setMinutes(new Date(session.startTime).getMinutes());
      
      await api.duplicateSession(session.id, tomorrow.toISOString());
      Alert.alert('Gekopieerd', 'De sessie is gekopieerd naar morgen.');
      setSelectedMySession(null);
      loadMySessions();
    } catch (error) {
      console.error('Duplicate session error:', error);
      Alert.alert('Fout', 'Kon sessie niet kopiëren.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (session: Session) => {
    setEditData({ title: session.title, notes: session.notes || '' });
    setShowEditModal(true);
  };

  const handleRequestJoin = async (session: Session) => {
    try {
      setRequestingJoin(true);
      await api.requestJoinSession(session.id);
      setSelectedSession(null);
      loadSessions();
    } catch (error) {
      console.error('Join request error:', error);
    } finally {
      setRequestingJoin(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Vandaag ${date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Morgen ${date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSessionCard = ({ item }: { item: Session }) => (
    <Card
      style={[styles.sessionCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => setSelectedSession(item)}
    >
      <Card.Content>
        <View style={styles.sessionHeader}>
          <Text variant="titleMedium" style={styles.sessionTitle}>
            {item.title}
          </Text>
          <Chip compact icon="account-multiple">
            {item.slotsAvailable}/{item.slots}
          </Chip>
        </View>

        <View style={styles.sessionInfo}>
          <MaterialCommunityIcons name="dumbbell" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {item.gymName}
          </Text>
        </View>

        <View style={styles.sessionInfo}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatDate(item.startTime)} • {item.durationMinutes} min
          </Text>
        </View>

        {item.distance !== undefined && (
          <View style={styles.sessionInfo}>
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.distance} km
            </Text>
          </View>
        )}

        <View style={styles.sessionChips}>
          <Chip compact style={styles.chip}>
            {getLabel(WORKOUT_TYPES, item.workoutType)}
          </Chip>
          <Chip compact style={styles.chip}>
            {getLabel(INTENSITIES, item.intensity)}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  // Count pending requests across all my sessions
  const pendingRequestsCount = mySessions.reduce((count, session) => {
    return count + (session.joinRequests?.filter(r => r.status === 'pending').length || 0);
  }, 0);

  // Filter sessions based on status
  const filteredMySessions = mySessions.filter(session => {
    if (sessionFilter === 'all') return true;
    const status = getSessionStatus(session);
    if (sessionFilter === 'upcoming') return status === 'upcoming' || status === 'ongoing';
    return status === 'past';
  });

  // Session status badge component
  const StatusBadge = ({ status }: { status: SessionStatus }) => {
    const configs = {
      upcoming: { icon: 'clock-outline', color: theme.colors.primary, bg: theme.colors.primaryContainer, text: 'Gepland' },
      ongoing: { icon: 'play-circle', color: '#22c55e', bg: '#dcfce7', text: 'Nu bezig' },
      past: { icon: 'check-circle', color: theme.colors.onSurfaceVariant, bg: theme.colors.surfaceVariant, text: 'Afgelopen' },
    };
    const config = configs[status];
    return (
      <Chip 
        compact 
        icon={config.icon}
        style={{ backgroundColor: config.bg }}
        textStyle={{ color: config.color, fontSize: 11 }}
      >
        {config.text}
      </Chip>
    );
  };

  const renderMySessionCard = ({ item }: { item: Session }) => {
    const pendingRequests = item.joinRequests?.filter(r => r.status === 'pending') || [];
    const acceptedRequests = item.joinRequests?.filter(r => r.status === 'accepted') || [];
    const status = getSessionStatus(item);
    const isPast = status === 'past';

    return (
      <Card 
        style={[
          styles.sessionCard, 
          { backgroundColor: theme.colors.surface },
          isPast && { opacity: 0.7 }
        ]}
        onPress={() => setSelectedMySession(item)}
      >
        <Card.Content>
          {/* Header with status and menu */}
          <View style={styles.sessionHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <StatusBadge status={status} />
                {pendingRequests.length > 0 && (
                  <Badge style={{ backgroundColor: theme.colors.error }}>{pendingRequests.length}</Badge>
                )}
              </View>
              <Text variant="titleMedium" style={styles.sessionTitle}>
                {item.title}
              </Text>
            </View>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(item.id)}
                />
              }
            >
              <Menu.Item 
                leadingIcon="pencil" 
                onPress={() => { setMenuVisible(null); setSelectedMySession(item); openEditModal(item); }} 
                title="Bewerken" 
              />
              <Menu.Item 
                leadingIcon="content-copy" 
                onPress={() => { setMenuVisible(null); handleDuplicateSession(item); }} 
                title="Kopiëren" 
              />
              <Divider />
              <Menu.Item 
                leadingIcon="delete" 
                onPress={() => { setMenuVisible(null); handleDeleteSession(item); }} 
                title="Verwijderen"
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
          </View>

          {/* Location */}
          <View style={styles.sessionInfo}>
            <MaterialCommunityIcons name="dumbbell" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.gymName}
            </Text>
          </View>

          {/* Time */}
          <View style={styles.sessionInfo}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDate(item.startTime)} • {item.durationMinutes} min
            </Text>
          </View>

          {/* Slots */}
          <View style={styles.sessionInfo}>
            <MaterialCommunityIcons name="account-multiple" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.slots - item.slotsAvailable}/{item.slots} deelnemers
            </Text>
          </View>

          <View style={styles.sessionChips}>
            <Chip compact style={styles.chip}>
              {getLabel(WORKOUT_TYPES, item.workoutType)}
            </Chip>
            <Chip compact style={styles.chip}>
              {getLabel(INTENSITIES, item.intensity)}
            </Chip>
          </View>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && !isPast && (
            <View style={styles.requestsSection}>
              <Divider style={{ marginVertical: 12 }} />
              <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.primary }}>
                📨 {pendingRequests.length} aanvra{pendingRequests.length === 1 ? 'ag' : 'gen'}
              </Text>
              {pendingRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    {request.requester?.avatarUrl ? (
                      <Avatar.Image size={40} source={{ uri: request.requester.avatarUrl }} />
                    ) : (
                      <Avatar.Text
                        size={40}
                        label={request.requester?.name?.substring(0, 2).toUpperCase() || '??'}
                        style={{ backgroundColor: theme.colors.primaryContainer }}
                      />
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                        {request.requester?.name || 'Onbekend'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {request.requester?.level ? getLabel(LEVELS, request.requester.level) : 'Geen niveau'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <IconButton
                      icon="check"
                      mode="contained"
                      containerColor={theme.colors.primaryContainer}
                      iconColor={theme.colors.primary}
                      size={20}
                      onPress={() => handleAcceptRequest(item.id, request.id)}
                      disabled={handlingRequest === request.id}
                      loading={handlingRequest === request.id}
                    />
                    <IconButton
                      icon="close"
                      mode="contained"
                      containerColor={theme.colors.errorContainer}
                      iconColor={theme.colors.error}
                      size={20}
                      onPress={() => handleDeclineRequest(item.id, request.id)}
                      disabled={handlingRequest === request.id}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Accepted Participants */}
          {acceptedRequests.length > 0 && (
            <View style={styles.participantsSection}>
              <Divider style={{ marginVertical: 12 }} />
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                ✅ Deelnemers ({acceptedRequests.length})
              </Text>
              {acceptedRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    {request.requester?.avatarUrl ? (
                      <Avatar.Image size={36} source={{ uri: request.requester.avatarUrl }} />
                    ) : (
                      <Avatar.Text
                        size={36}
                        label={request.requester?.name?.substring(0, 2).toUpperCase() || '??'}
                        style={{ backgroundColor: theme.colors.primaryContainer }}
                      />
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                        {request.requester?.name || 'Onbekend'}
                      </Text>
                    </View>
                  </View>
                  {!isPast && (
                    <IconButton
                      icon="account-remove"
                      mode="contained"
                      containerColor={theme.colors.errorContainer}
                      iconColor={theme.colors.error}
                      size={18}
                      onPress={() => handleRemoveParticipant(item, request)}
                      disabled={handlingRequest === request.id}
                    />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Notes */}
          {item.notes && (
            <View style={[styles.notesSection, { marginTop: 12 }]}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                📝 {item.notes}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  // Loading state
  if ((mainTab === 'nearby' && loading) || (mainTab === 'mine' && loadingMine)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={{ marginTop: 16 }}>
            Sessies laden...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Main Tab Selector */}
      <View style={styles.mainTabContainer}>
        <SegmentedButtons
          value={mainTab}
          onValueChange={(value) => setMainTab(value as 'nearby' | 'mine')}
          buttons={[
            { value: 'nearby', label: 'In de buurt' },
            { 
              value: 'mine', 
              label: `Mijn sessies${pendingRequestsCount > 0 ? ` (${pendingRequestsCount})` : ''}`,
            },
          ]}
          style={styles.mainTabButtons}
        />
      </View>

      {/* Nearby Sessions View */}
      {mainTab === 'nearby' && (
        <>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.headerTitle}>
              Sessies in de buurt
            </Text>
            <SegmentedButtons
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'map' | 'list')}
              buttons={[
                { value: 'map', label: 'Kaart', icon: 'map' },
                { value: 'list', label: 'Lijst', icon: 'format-list-bulleted' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location?.lat || 52.3676,
              longitude: location?.lng || 4.9041,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {location && (
              <Marker
                coordinate={{ latitude: location.lat, longitude: location.lng }}
                title="Jouw locatie"
                pinColor="blue"
              />
            )}
            {sessions.map((session) => (
              <Marker
                key={session.id}
                coordinate={{ latitude: session.lat, longitude: session.lng }}
                title={session.title}
                description={`${session.gymName} • ${session.slotsAvailable} plekken`}
                onPress={() => setSelectedSession(session)}
              />
            ))}
          </MapView>

          {sessions.length === 0 && (
            <View style={[styles.noSessionsOverlay, { backgroundColor: theme.colors.surface }]}>
              <Text variant="bodyLarge">Geen sessies in de buurt</Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={60}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="titleLarge" style={{ marginTop: 16 }}>
                Geen sessies gevonden
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
              >
                Er zijn nog geen sessies gepland in jouw omgeving.
              </Text>
            </View>
          }
        />
      )}
      </>
      )}

      {/* My Sessions View */}
      {mainTab === 'mine' && (
        <>
          {/* Filter tabs */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip
                selected={sessionFilter === 'all'}
                onPress={() => setSessionFilter('all')}
                showSelectedOverlay
              >
                Alle ({mySessions.length})
              </Chip>
              <Chip
                selected={sessionFilter === 'upcoming'}
                onPress={() => setSessionFilter('upcoming')}
                showSelectedOverlay
              >
                Gepland ({mySessions.filter(s => getSessionStatus(s) !== 'past').length})
              </Chip>
              <Chip
                selected={sessionFilter === 'past'}
                onPress={() => setSessionFilter('past')}
                showSelectedOverlay
              >
                Afgelopen ({mySessions.filter(s => getSessionStatus(s) === 'past').length})
              </Chip>
            </ScrollView>
          </View>

          <FlatList
            data={filteredMySessions}
            renderItem={renderMySessionCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={loadingMine}
            onRefresh={loadMySessions}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name={sessionFilter === 'past' ? 'history' : 'calendar-plus'}
                  size={60}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="titleLarge" style={{ marginTop: 16 }}>
                  {sessionFilter === 'past' ? 'Geen afgelopen sessies' : 'Geen sessies gepland'}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
                >
                  {sessionFilter === 'past' 
                    ? 'Je afgelopen sessies verschijnen hier.'
                    : 'Maak een sessie aan en anderen kunnen meedoen!'}
                </Text>
              </View>
            }
          />
        </>
      )}

      <Portal>
        <Modal
          visible={!!selectedSession}
          onDismiss={() => setSelectedSession(null)}
          contentContainerStyle={[styles.sessionModal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedSession && (
            <>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                {selectedSession.title}
              </Text>

              <View style={styles.modalInfo}>
                <MaterialCommunityIcons name="account" size={20} color={theme.colors.primary} />
                <Text variant="bodyLarge">
                  {selectedSession.owner?.name || 'Onbekend'}
                </Text>
              </View>

              <View style={styles.modalInfo}>
                <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedSession.gymName}
                </Text>
              </View>

              <View style={styles.modalInfo}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatDate(selectedSession.startTime)} • {selectedSession.durationMinutes} min
                </Text>
              </View>

              <View style={styles.modalInfo}>
                <MaterialCommunityIcons name="account-multiple" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedSession.slotsAvailable} van {selectedSession.slots} plekken beschikbaar
                </Text>
              </View>

              <View style={styles.modalChips}>
                <Chip>{getLabel(WORKOUT_TYPES, selectedSession.workoutType)}</Chip>
                <Chip>{getLabel(INTENSITIES, selectedSession.intensity)}</Chip>
              </View>

              {selectedSession.notes && (
                <View style={styles.notesSection}>
                  <Text variant="titleSmall">Notities</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    {selectedSession.notes}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                {selectedSession.myRequestStatus === 'pending' ? (
                  <Button mode="outlined" disabled>
                    Verzoek verzonden
                  </Button>
                ) : selectedSession.myRequestStatus === 'accepted' ? (
                  <Button mode="contained" disabled>
                    Je doet mee! ✓
                  </Button>
                ) : selectedSession.slotsAvailable > 0 ? (
                  <Button
                    mode="contained"
                    onPress={() => handleRequestJoin(selectedSession)}
                    loading={requestingJoin}
                    disabled={requestingJoin}
                  >
                    Vraag om mee te doen
                  </Button>
                ) : (
                  <Button mode="outlined" disabled>
                    Geen plekken meer
                  </Button>
                )}
                <Button mode="text" onPress={() => setSelectedSession(null)}>
                  Sluiten
                </Button>
              </View>
            </>
          )}
        </Modal>

        {/* Edit Session Modal */}
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={[styles.sessionModal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 16 }}>
            Sessie bewerken
          </Text>

          <TextInput
            label="Titel"
            value={editData.title}
            onChangeText={(text) => setEditData(prev => ({ ...prev, title: text }))}
            mode="outlined"
            style={{ marginBottom: 12 }}
          />

          <TextInput
            label="Notities (optioneel)"
            value={editData.notes}
            onChangeText={(text) => setEditData(prev => ({ ...prev, notes: text }))}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={{ marginBottom: 16 }}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              mode="outlined"
              onPress={() => setShowEditModal(false)}
              style={{ flex: 1 }}
            >
              Annuleren
            </Button>
            <Button
              mode="contained"
              onPress={handleEditSession}
              loading={actionLoading}
              disabled={actionLoading || !editData.title.trim()}
              style={{ flex: 1 }}
            >
              Opslaan
            </Button>
          </View>
        </Modal>

        {/* Session Details Modal */}
        <Modal
          visible={!!selectedMySession && !showEditModal}
          onDismiss={() => setSelectedMySession(null)}
          contentContainerStyle={[styles.sessionModal, { backgroundColor: theme.colors.surface, maxHeight: '80%' }]}
        >
          {selectedMySession && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Chip 
                      compact 
                      icon={getSessionStatus(selectedMySession) === 'ongoing' ? 'play-circle' : getSessionStatus(selectedMySession) === 'upcoming' ? 'clock-outline' : 'check-circle'}
                      style={{ 
                        backgroundColor: getSessionStatus(selectedMySession) === 'ongoing' ? '#dcfce7' : 
                          getSessionStatus(selectedMySession) === 'upcoming' ? theme.colors.primaryContainer : theme.colors.surfaceVariant 
                      }}
                    >
                      {getSessionStatus(selectedMySession) === 'ongoing' ? 'Nu bezig' : 
                        getSessionStatus(selectedMySession) === 'upcoming' ? 'Gepland' : 'Afgelopen'}
                    </Chip>
                  </View>
                  <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                    {selectedMySession.title}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setSelectedMySession(null)}
                />
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {/* Session info */}
              <View style={styles.modalInfo}>
                <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge">{selectedMySession.gymName}</Text>
              </View>

              <View style={styles.modalInfo}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatDate(selectedMySession.startTime)} • {selectedMySession.durationMinutes} min
                </Text>
              </View>

              <View style={styles.modalInfo}>
                <MaterialCommunityIcons name="account-multiple" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedMySession.slots - selectedMySession.slotsAvailable}/{selectedMySession.slots} deelnemers
                </Text>
              </View>

              <View style={styles.modalChips}>
                <Chip>{getLabel(WORKOUT_TYPES, selectedMySession.workoutType)}</Chip>
                <Chip>{getLabel(INTENSITIES, selectedMySession.intensity)}</Chip>
              </View>

              {selectedMySession.notes && (
                <View style={[styles.notesSection, { marginTop: 16 }]}>
                  <Text variant="titleSmall">Notities</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    {selectedMySession.notes}
                  </Text>
                </View>
              )}

              {/* Participants */}
              {(selectedMySession.joinRequests?.filter(r => r.status === 'accepted').length || 0) > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    Deelnemers ({selectedMySession.joinRequests?.filter(r => r.status === 'accepted').length})
                  </Text>
                  {selectedMySession.joinRequests?.filter(r => r.status === 'accepted').map(request => (
                    <View key={request.id} style={styles.requestItem}>
                      <View style={styles.requestInfo}>
                        {request.requester?.avatarUrl ? (
                          <Avatar.Image size={40} source={{ uri: request.requester.avatarUrl }} />
                        ) : (
                          <Avatar.Text
                            size={40}
                            label={request.requester?.name?.substring(0, 2).toUpperCase() || '??'}
                            style={{ backgroundColor: theme.colors.primaryContainer }}
                          />
                        )}
                        <View style={{ marginLeft: 12 }}>
                          <Text variant="bodyLarge" style={{ fontWeight: '500' }}>
                            {request.requester?.name}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {request.requester?.level ? getLabel(LEVELS, request.requester.level) : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Divider style={{ marginVertical: 16 }} />

              {/* Action buttons */}
              <View style={{ gap: 8 }}>
                <Button
                  mode="contained"
                  icon="pencil"
                  onPress={() => openEditModal(selectedMySession)}
                >
                  Bewerken
                </Button>
                <Button
                  mode="outlined"
                  icon="content-copy"
                  onPress={() => handleDuplicateSession(selectedMySession)}
                  loading={actionLoading}
                >
                  Kopieer naar morgen
                </Button>
                <Button
                  mode="outlined"
                  icon="delete"
                  textColor={theme.colors.error}
                  onPress={() => handleDeleteSession(selectedMySession)}
                >
                  Verwijderen
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTabContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  mainTabButtons: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  segmentedButtons: {
    width: 180,
  },
  requestsSection: {
    marginTop: 4,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 4,
  },
  participantsSection: {
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  noSessionsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  sessionCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    fontWeight: '600',
    flex: 1,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sessionChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    height: 28,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  sessionModal: {
    margin: 24,
    padding: 24,
    borderRadius: 16,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  modalChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  notesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  modalButtons: {
    marginTop: 24,
    gap: 8,
  },
});



