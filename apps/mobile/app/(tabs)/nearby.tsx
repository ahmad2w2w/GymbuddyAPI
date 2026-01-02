import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Text, Button, useTheme, Card, Chip, IconButton, SegmentedButtons, ActivityIndicator, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { api, Session } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getLabel, WORKOUT_TYPES, INTENSITIES } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NearbyScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);

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
    loadSessions();
  }, [loadSessions]);

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

  if (loading) {
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
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Nearby
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
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
