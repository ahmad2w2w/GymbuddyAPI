import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, ScrollView, TouchableOpacity, useColorScheme, RefreshControl, Linking, Platform } from 'react-native';
import { Text, Button, useTheme, Card, Chip, IconButton, SegmentedButtons, ActivityIndicator, Portal, Modal, Badge, Avatar, Divider, TextInput, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { api, Session, JoinRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getLabel, WORKOUT_TYPES, INTENSITIES, LEVELS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Workout type colors and icons
const WORKOUT_COLORS: Record<string, { gradient: [string, string]; icon: string }> = {
  push: { gradient: ['#FF6B35', '#FF3D00'], icon: 'arm-flex' },
  pull: { gradient: ['#7C4DFF', '#651FFF'], icon: 'rowing' },
  legs: { gradient: ['#00C853', '#00E676'], icon: 'run' },
  cardio: { gradient: ['#00B0FF', '#0091EA'], icon: 'heart-pulse' },
  full_body: { gradient: ['#FF1744', '#F50057'], icon: 'human-handsup' },
  upper: { gradient: ['#FFB300', '#FFA000'], icon: 'arm-flex-outline' },
  lower: { gradient: ['#26A69A', '#00897B'], icon: 'shoe-sneaker' },
  core: { gradient: ['#EC407A', '#D81B60'], icon: 'meditation' },
  hiit: { gradient: ['#FF5722', '#E64A19'], icon: 'lightning-bolt' },
  yoga: { gradient: ['#9575CD', '#7E57C2'], icon: 'yoga' },
  other: { gradient: ['#78909C', '#546E7A'], icon: 'dumbbell' },
};

const getWorkoutStyle = (workoutType: string) => {
  return WORKOUT_COLORS[workoutType] || WORKOUT_COLORS.other;
};

// Dark mode map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d1d2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a4e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#252536' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2a1a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
];

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
  const router = useRouter();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Main tab: 'nearby' or 'mine'
  const [mainTab, setMainTab] = useState<'nearby' | 'mine'>('nearby');
  const [refreshing, setRefreshing] = useState(false);
  
  // Nearby sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [mapPreviewSession, setMapPreviewSession] = useState<Session | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  
  // Location mode: search around gym or current GPS location
  const [locationMode, setLocationMode] = useState<'gym' | 'current'>('gym');
  const [currentGpsLocation, setCurrentGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // My sessions state
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<Session[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [handlingRequest, setHandlingRequest] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'upcoming' | 'past' | 'joined'>('all');
  
  // My session actions state
  const [selectedMySession, setSelectedMySession] = useState<Session | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<{ title: string; notes: string }>({ title: '', notes: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  // Get current GPS location
  const getCurrentGpsLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'denied') {
        Alert.alert(
          'Locatie nodig',
          'Zet locatie aan in Instellingen om je huidige positie te gebruiken.',
          [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Open Instellingen', onPress: openSettings }
          ]
        );
        return null;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
      return null;
    } catch (error) {
      console.error('GPS error:', error);
      return null;
    }
  }, [openSettings]);

  // Search sessions at specific coordinates
  const searchSessionsAt = useCallback(async (searchLat: number, searchLng: number) => {
    try {
      setLoading(true);
      setLocation({ lat: searchLat, lng: searchLng });

      console.log(`🔍 Searching sessions at: ${searchLat}, ${searchLng} (radius: ${user?.preferredRadius || 15}km)`);

      const response = await api.getNearbySessions({
        lat: searchLat,
        lng: searchLng,
        radiusKm: user?.preferredRadius || 15,
      });

      if (response.success) {
        console.log(`📍 Found ${response.data.length} sessions`);
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Load sessions error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.preferredRadius]);

  // Toggle location mode (used by the map button)
  const toggleLocationMode = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (locationMode === 'gym') {
      // Switch to current GPS location
      setGpsLoading(true);
      const gps = await getCurrentGpsLocation();
      setGpsLoading(false);
      
      if (gps) {
        console.log(`📍 GPS location: ${gps.lat}, ${gps.lng}`);
        setCurrentGpsLocation(gps);
        setLocationMode('current');
        setLocation(gps);
        // Directly search at the new location
        await searchSessionsAt(gps.lat, gps.lng);
        return gps;
      }
      return null;
    } else {
      // Switch back to gym location
      setLocationMode('gym');
      if (user?.lat && user?.lng) {
        setLocation({ lat: user.lat, lng: user.lng });
        // Directly search at gym location
        await searchSessionsAt(user.lat, user.lng);
        return { lat: user.lat, lng: user.lng };
      }
      return null;
    }
  }, [getCurrentGpsLocation, user, locationMode, searchSessionsAt]);

  const loadSessions = useCallback(async () => {
    let searchLat: number;
    let searchLng: number;

    if (locationMode === 'current' && currentGpsLocation) {
      // Use current GPS location
      searchLat = currentGpsLocation.lat;
      searchLng = currentGpsLocation.lng;
    } else {
      // Use gym location (default)
      searchLat = user?.lat || 52.3676;
      searchLng = user?.lng || 4.9041;
    }

    await searchSessionsAt(searchLat, searchLng);
  }, [user, locationMode, currentGpsLocation, searchSessionsAt]);

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
      // Load both created sessions and joined sessions in parallel
      const [myResponse, joinedResponse] = await Promise.all([
        api.getMySessions(),
        api.getJoinedSessions()
      ]);
      
      if (myResponse.success) {
        setMySessions(myResponse.data);
      }
      if (joinedResponse.success) {
        setJoinedSessions(joinedResponse.data);
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

  // Get time until session starts
  const getTimeUntil = (dateStr: string) => {
    const now = new Date();
    const start = new Date(dateStr);
    const diff = start.getTime() - now.getTime();
    
    if (diff < 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    }
    if (hours > 0) return `${hours}u ${minutes}m`;
    return `${minutes}m`;
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mainTab === 'nearby') {
      await loadSessions();
    } else {
      await loadMySessions();
    }
    setRefreshing(false);
  }, [mainTab, loadSessions, loadMySessions]);

  const renderSessionCard = ({ item }: { item: Session }) => {
    const workoutStyle = getWorkoutStyle(item.workoutType);
    const status = getSessionStatus(item);
    const timeUntil = getTimeUntil(item.startTime);
    
    // Determine join status badge
    const getJoinStatusBadge = () => {
      if (!item.myJoinStatus || item.myJoinStatus === 'none') return null;
      
      const statusConfig = {
        pending: { color: '#FFA000', icon: 'clock-outline' as const, text: 'Aangevraagd' },
        accepted: { color: '#00C853', icon: 'check-circle' as const, text: 'Geaccepteerd' },
        declined: { color: '#FF1744', icon: 'close-circle' as const, text: 'Afgewezen' },
      };
      
      const config = statusConfig[item.myJoinStatus];
      if (!config) return null;
      
      return (
        <View style={[styles.joinStatusBadge, { backgroundColor: config.color }]}>
          <MaterialCommunityIcons name={config.icon} size={12} color="white" />
          <Text style={styles.joinStatusText}>{config.text}</Text>
        </View>
      );
    };
    
    return (
      <TouchableOpacity
        style={[styles.sessionCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
        onPress={() => setSelectedSession(item)}
        activeOpacity={0.7}
      >
        {/* Colored accent bar */}
        <LinearGradient
          colors={workoutStyle.gradient}
          style={styles.cardAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        {/* Join status badge at top */}
        {getJoinStatusBadge()}
        
        <View style={styles.cardContent}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            {/* Owner avatar instead of workout icon */}
            {item.owner?.avatarUrl ? (
              <Avatar.Image size={44} source={{ uri: item.owner.avatarUrl }} />
            ) : (
              <Avatar.Text 
                size={44} 
                label={item.owner?.name?.substring(0, 1).toUpperCase() || '?'} 
                style={{ backgroundColor: workoutStyle.gradient[0] }}
              />
            )}
            <View style={styles.cardHeaderText}>
              <Text variant="titleMedium" style={[styles.sessionTitle, { color: theme.colors.onBackground }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.owner?.name || 'Onbekend'}
                </Text>
                {item.owner?.level && (
                  <View style={[styles.levelBadge, { backgroundColor: workoutStyle.gradient[0] + '20' }]}>
                    <Text style={[styles.levelBadgeText, { color: workoutStyle.gradient[0] }]}>
                      {item.owner.level === 'beginner' ? '🌱' : item.owner.level === 'intermediate' ? '💪' : '🔥'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {/* Time badge */}
            {status === 'ongoing' ? (
              <View style={[styles.timeBadge, { backgroundColor: '#00C853' }]}>
                <MaterialCommunityIcons name="play" size={12} color="white" />
                <Text style={styles.timeBadgeText}>LIVE</Text>
              </View>
            ) : timeUntil ? (
              <View style={[styles.timeBadge, { backgroundColor: workoutStyle.gradient[0] }]}>
                <MaterialCommunityIcons name="clock-outline" size={12} color="white" />
                <Text style={styles.timeBadgeText}>{timeUntil}</Text>
              </View>
            ) : null}
          </View>

          {/* Info rows */}
          <View style={styles.cardInfoSection}>
            <View style={styles.cardInfoRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                {item.gymName}
              </Text>
              {item.distance !== undefined && (
                <Text variant="labelMedium" style={{ color: workoutStyle.gradient[0], fontWeight: '600' }}>
                  {item.distance} km
                </Text>
              )}
            </View>

            <View style={styles.cardInfoRow}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(item.startTime)}
              </Text>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.durationMinutes} min
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.cardChips}>
              <View style={[styles.workoutChip, { backgroundColor: workoutStyle.gradient[0] + '15' }]}>
                <Text style={[styles.workoutChipText, { color: workoutStyle.gradient[0] }]}>
                  {getLabel(WORKOUT_TYPES, item.workoutType)}
                </Text>
              </View>
              <View style={[styles.intensityChip, { backgroundColor: isDark ? '#252536' : '#F0F0F0' }]}>
                <Text style={[styles.intensityChipText, { color: theme.colors.onSurfaceVariant }]}>
                  {getLabel(INTENSITIES, item.intensity)}
                </Text>
              </View>
            </View>
            
            {/* Slots indicator - clearer text */}
            <View style={styles.slotsContainer}>
              <MaterialCommunityIcons 
                name={item.slotsAvailable === 0 ? 'account-group' : 'account-multiple-plus'} 
                size={14} 
                color={item.slotsAvailable === 0 ? '#FF1744' : workoutStyle.gradient[0]} 
              />
              <Text variant="labelSmall" style={{ 
                color: item.slotsAvailable === 0 ? '#FF1744' : theme.colors.onSurfaceVariant,
                fontWeight: item.slotsAvailable === 0 ? '700' : '500'
              }}>
                {item.slotsAvailable === 0 
                  ? 'Vol' 
                  : item.slotsAvailable === 1 
                    ? '1 plek vrij' 
                    : `${item.slotsAvailable} plekken vrij`}
              </Text>
            </View>
          </View>
          
          {/* Notes preview if available */}
          {item.notes && (
            <View style={styles.notesPreview}>
              <MaterialCommunityIcons name="format-quote-open" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, fontStyle: 'italic' }} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Count pending requests across all my sessions
  const pendingRequestsCount = mySessions.reduce((count, session) => {
    return count + (session.joinRequests?.filter(r => r.status === 'pending').length || 0);
  }, 0);

  // Filter sessions based on status
  const filteredMySessions = sessionFilter === 'joined' 
    ? joinedSessions // Show joined sessions when that filter is active
    : mySessions.filter(session => {
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

  // Card for sessions the user has joined (different from sessions they created)
  const renderJoinedSessionCard = ({ item }: { item: Session }) => {
    const status = getSessionStatus(item);
    const isPast = status === 'past';
    const workoutStyle = getWorkoutStyle(item.workoutType);
    const timeUntil = getTimeUntil(item.startTime);
    
    return (
      <TouchableOpacity 
        style={[
          styles.mySessionCard, 
          { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
          isPast && { opacity: 0.6 }
        ]}
        onPress={() => setSelectedSession(item)}
        activeOpacity={0.7}
      >
        {/* Top colored bar - purple for joined sessions */}
        <LinearGradient
          colors={item.myJoinStatus === 'accepted' ? ['#00C853', '#00E676'] : ['#FFA000', '#FFB300']}
          style={styles.myCardTopBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />

        <View style={styles.myCardContent}>
          {/* Header Row */}
          <View style={styles.myCardHeader}>
            {/* Join status badge */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.myJoinStatus === 'accepted' ? '#00C853' : '#FFA000' }
            ]}>
              <MaterialCommunityIcons 
                name={item.myJoinStatus === 'accepted' ? 'check-circle' : 'clock-outline'} 
                size={12} 
                color="white" 
              />
              <Text style={styles.statusBadgeText}>
                {item.myJoinStatus === 'accepted' ? 'Geaccepteerd' : 'Wacht op goedkeuring'}
              </Text>
            </View>
            
            {/* Time until */}
            {status !== 'past' && timeUntil && (
              <View style={[styles.statusBadge, { backgroundColor: workoutStyle.gradient[0], marginLeft: 8 }]}>
                <MaterialCommunityIcons name="clock-outline" size={12} color="white" />
                <Text style={styles.statusBadgeText}>{timeUntil}</Text>
              </View>
            )}
          </View>

          {/* Owner info */}
          <View style={styles.myCardTitleRow}>
            {item.owner?.avatarUrl ? (
              <Avatar.Image size={40} source={{ uri: item.owner.avatarUrl }} />
            ) : (
              <Avatar.Text 
                size={40} 
                label={item.owner?.name?.substring(0, 1).toUpperCase() || '?'} 
                style={{ backgroundColor: workoutStyle.gradient[0] }}
              />
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleMedium" style={[styles.myCardTitle, { color: theme.colors.onBackground }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Door {item.owner?.name || 'Onbekend'}
              </Text>
            </View>
          </View>

          {/* Info Grid */}
          <View style={styles.myCardInfoGrid}>
            <View style={styles.myCardInfoItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                {item.gymName}
              </Text>
            </View>
            <View style={styles.myCardInfoItem}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(item.startTime)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                • {item.durationMinutes} min
              </Text>
            </View>
          </View>

          {/* Workout type chips */}
          <View style={[styles.cardChips, { marginTop: 12 }]}>
            <View style={[styles.workoutChip, { backgroundColor: workoutStyle.gradient[0] + '15' }]}>
              <Text style={[styles.workoutChipText, { color: workoutStyle.gradient[0] }]}>
                {getLabel(WORKOUT_TYPES, item.workoutType)}
              </Text>
            </View>
            <View style={[styles.intensityChip, { backgroundColor: isDark ? '#252536' : '#F0F0F0' }]}>
              <Text style={[styles.intensityChipText, { color: theme.colors.onSurfaceVariant }]}>
                {getLabel(INTENSITIES, item.intensity)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMySessionCard = ({ item }: { item: Session }) => {
    const pendingRequests = item.joinRequests?.filter(r => r.status === 'pending') || [];
    const acceptedRequests = item.joinRequests?.filter(r => r.status === 'accepted') || [];
    const status = getSessionStatus(item);
    const isPast = status === 'past';
    const workoutStyle = getWorkoutStyle(item.workoutType);
    const timeUntil = getTimeUntil(item.startTime);

    return (
      <TouchableOpacity 
        style={[
          styles.mySessionCard, 
          { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
          isPast && { opacity: 0.6 }
        ]}
        onPress={() => setSelectedMySession(item)}
        activeOpacity={0.7}
      >
        {/* Top colored bar based on status */}
        <LinearGradient
          colors={status === 'ongoing' ? ['#00C853', '#00E676'] : status === 'upcoming' ? workoutStyle.gradient : ['#9E9E9E', '#BDBDBD']}
          style={styles.myCardTopBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />

        <View style={styles.myCardContent}>
          {/* Header Row */}
          <View style={styles.myCardHeader}>
            {/* Status badge */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: status === 'ongoing' ? '#00C853' : status === 'upcoming' ? workoutStyle.gradient[0] : '#9E9E9E' }
            ]}>
              <MaterialCommunityIcons 
                name={status === 'ongoing' ? 'play-circle' : status === 'upcoming' ? 'clock-outline' : 'check-circle'} 
                size={12} 
                color="white" 
              />
              <Text style={styles.statusBadgeText}>
                {status === 'ongoing' ? 'LIVE' : status === 'upcoming' ? (timeUntil || 'Gepland') : 'Klaar'}
              </Text>
            </View>
            
            {/* Pending notification - more descriptive */}
            {pendingRequests.length > 0 && (
              <View style={styles.pendingBadge}>
                <MaterialCommunityIcons name="account-clock" size={12} color="white" />
                <Text style={styles.pendingBadgeText}>
                  {pendingRequests.length} {pendingRequests.length === 1 ? 'aanvraag' : 'aanvragen'}
                </Text>
              </View>
            )}
            
            {/* Menu */}
            <View style={{ flex: 1 }} />
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <TouchableOpacity 
                  style={styles.menuButton}
                  onPress={() => setMenuVisible(item.id)}
                >
                  <MaterialCommunityIcons name="dots-vertical" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
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

          {/* Title with workout icon */}
          <View style={styles.myCardTitleRow}>
            <View style={[styles.myWorkoutIcon, { backgroundColor: workoutStyle.gradient[0] + '20' }]}>
              <MaterialCommunityIcons name={workoutStyle.icon as any} size={20} color={workoutStyle.gradient[0]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={[styles.myCardTitle, { color: theme.colors.onBackground }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {getLabel(WORKOUT_TYPES, item.workoutType)} • {getLabel(INTENSITIES, item.intensity)}
              </Text>
            </View>
          </View>

          {/* Info Grid */}
          <View style={styles.myCardInfoGrid}>
            <View style={styles.myCardInfoItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                {item.gymName}
              </Text>
            </View>
            <View style={styles.myCardInfoItem}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(item.startTime)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                • {item.durationMinutes} min
              </Text>
            </View>
          </View>
          
          {/* Notes preview if available */}
          {item.notes && (
            <View style={[styles.notesPreview, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 8, marginTop: 8 }]}>
              <MaterialCommunityIcons name="note-text-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, fontStyle: 'italic' }} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          )}

          {/* Participants Progress Bar - Clearer text */}
          <View style={styles.participantsProgress}>
            <View style={styles.participantsLabels}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.slotsAvailable === 0 
                  ? '✅ Vol - alle plekken bezet' 
                  : item.slotsAvailable === item.slots 
                    ? `Nog niemand aangemeld (${item.slots} ${item.slots === 1 ? 'plek' : 'plekken'})`
                    : `${item.slots - item.slotsAvailable} aangemeld, ${item.slotsAvailable} ${item.slotsAvailable === 1 ? 'plek' : 'plekken'} vrij`}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${((item.slots - item.slotsAvailable) / item.slots) * 100}%`,
                    backgroundColor: workoutStyle.gradient[0] 
                  }
                ]} 
              />
            </View>
            {/* Avatar stack */}
            {acceptedRequests.length > 0 && (
              <View style={styles.avatarStack}>
                {acceptedRequests.slice(0, 3).map((request, index) => (
                  <View key={request.id} style={[styles.stackedAvatar, { marginLeft: index > 0 ? -8 : 0, zIndex: 3 - index }]}>
                    {request.requester?.avatarUrl ? (
                      <Avatar.Image size={24} source={{ uri: request.requester.avatarUrl }} />
                    ) : (
                      <Avatar.Text
                        size={24}
                        label={request.requester?.name?.substring(0, 1).toUpperCase() || '?'}
                        style={{ backgroundColor: workoutStyle.gradient[0] }}
                        labelStyle={{ fontSize: 10 }}
                      />
                    )}
                  </View>
                ))}
                {acceptedRequests.length > 3 && (
                  <View style={[styles.stackedAvatar, { marginLeft: -8, backgroundColor: isDark ? '#252536' : '#E0E0E0' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: theme.colors.onSurfaceVariant }}>
                      +{acceptedRequests.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && !isPast && (
            <View style={styles.pendingSection}>
              <View style={styles.pendingSectionHeader}>
                <MaterialCommunityIcons name="account-clock" size={16} color="#FF6B35" />
                <Text variant="labelMedium" style={{ color: '#FF6B35', fontWeight: '700', marginLeft: 6 }}>
                  {pendingRequests.length} wachtend{pendingRequests.length > 1 ? 'e' : ''} aanvra{pendingRequests.length === 1 ? 'ag' : 'gen'}
                </Text>
              </View>
              {pendingRequests.slice(0, 2).map((request) => (
                <View key={request.id} style={styles.pendingRequestItem}>
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
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onBackground }}>
                        {request.requester?.name || 'Onbekend'}
                      </Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {request.requester?.level ? getLabel(LEVELS, request.requester.level) : 'Geen niveau'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(item.id, request.id)}
                      disabled={handlingRequest === request.id}
                    >
                      {handlingRequest === request.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <MaterialCommunityIcons name="check" size={18} color="white" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleDeclineRequest(item.id, request.id)}
                      disabled={handlingRequest === request.id}
                    >
                      <MaterialCommunityIcons name="close" size={18} color="#FF1744" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {pendingRequests.length > 2 && (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                  +{pendingRequests.length - 2} meer
                </Text>
              )}
            </View>
          )}

          {/* Notes Preview */}
          {item.notes && (
            <View style={[styles.notesPreview, { backgroundColor: isDark ? '#252536' : '#F5F5F5' }]}>
              <MaterialCommunityIcons name="note-text" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if ((mainTab === 'nearby' && loading) || (mainTab === 'mine' && loadingMine)) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
        <SafeAreaView style={styles.loadingContainer} edges={['top']}>
          <LinearGradient
            colors={['#FF6B35', '#FF3D00']}
            style={styles.loadingIcon}
          >
            <MaterialCommunityIcons name="calendar-clock" size={32} color="white" />
          </LinearGradient>
          <Text variant="titleMedium" style={{ marginTop: 20, color: theme.colors.onBackground }}>
            Sessies laden...
          </Text>
          <ActivityIndicator size="small" style={{ marginTop: 16 }} color={theme.colors.primary} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header with gradient */}
        <LinearGradient
          colors={['#FF6B35', '#FF3D00']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="calendar-star" size={24} color="white" />
              <Text variant="titleLarge" style={styles.headerTitle}>
                Sessies
              </Text>
            </View>
            {pendingRequestsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{pendingRequestsCount}</Text>
              </View>
            )}
          </View>
          
          {/* Tab buttons in header */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, mainTab === 'nearby' && styles.tabButtonActive]}
              onPress={() => setMainTab('nearby')}
            >
              <MaterialCommunityIcons 
                name="map-marker-radius" 
                size={18} 
                color={mainTab === 'nearby' ? '#FF6B35' : 'rgba(255,255,255,0.7)'} 
              />
              <Text style={[styles.tabText, mainTab === 'nearby' && styles.tabTextActive]}>
                In de buurt
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, mainTab === 'mine' && styles.tabButtonActive]}
              onPress={() => setMainTab('mine')}
            >
              <MaterialCommunityIcons 
                name="account-circle" 
                size={18} 
                color={mainTab === 'mine' ? '#FF6B35' : 'rgba(255,255,255,0.7)'} 
              />
              <Text style={[styles.tabText, mainTab === 'mine' && styles.tabTextActive]}>
                Mijn sessies
              </Text>
              {pendingRequestsCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingRequestsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Nearby Sessions View */}
        {mainTab === 'nearby' && (
          <>
            {/* View mode toggle */}
            <View style={styles.viewModeContainer}>
              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <MaterialCommunityIcons 
                  name="format-list-bulleted" 
                  size={20} 
                  color={viewMode === 'list' ? '#FF6B35' : theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'map' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('map')}
              >
                <MaterialCommunityIcons 
                  name="map" 
                  size={20} 
                  color={viewMode === 'map' ? '#FF6B35' : theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {sessions.length} sessie{sessions.length !== 1 ? 's' : ''} gevonden
              </Text>
            </View>

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location?.lat || 52.3676,
              longitude: location?.lng || 4.9041,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
            onPress={() => setMapPreviewSession(null)}
            showsUserLocation={false}
            showsMyLocationButton={false}
            customMapStyle={isDark ? darkMapStyle : []}
          >
            {/* User location marker */}
            {location && (
              <Marker
                coordinate={{ latitude: location.lat, longitude: location.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.userMarkerOuter}>
                  <View style={styles.userMarkerInner}>
                    <View style={styles.userMarkerDot} />
                  </View>
                </View>
              </Marker>
            )}
            
            {/* Session markers with custom design */}
            {sessions.map((session) => {
              const workoutStyle = getWorkoutStyle(session.workoutType);
              const status = getSessionStatus(session);
              const isSelected = mapPreviewSession?.id === session.id;
              
              return (
                <Marker
                  key={session.id}
                  coordinate={{ latitude: session.lat, longitude: session.lng }}
                  onPress={(e) => {
                    e.stopPropagation();
                    setMapPreviewSession(session);
                    // Animate to marker
                    mapRef.current?.animateToRegion({
                      latitude: session.lat,
                      longitude: session.lng,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    }, 300);
                  }}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={styles.customMarkerContainer}>
                    {/* Pulse animation for live sessions */}
                    {status === 'ongoing' && (
                      <View style={styles.markerPulse} />
                    )}
                    <LinearGradient
                      colors={isSelected ? ['#FF6B35', '#FF3D00'] : workoutStyle.gradient}
                      style={[
                        styles.customMarker,
                        isSelected && styles.customMarkerSelected
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={workoutStyle.icon as any} 
                        size={isSelected ? 20 : 16} 
                        color="white" 
                      />
                    </LinearGradient>
                    {/* Marker pointer */}
                    <View style={[
                      styles.markerPointer,
                      { borderTopColor: isSelected ? '#FF3D00' : workoutStyle.gradient[1] }
                    ]} />
                    {/* Slots badge */}
                    {session.slotsAvailable > 0 && (
                      <View style={[styles.markerBadge, { backgroundColor: status === 'ongoing' ? '#00C853' : workoutStyle.gradient[0] }]}>
                        <Text style={styles.markerBadgeText}>{session.slotsAvailable}</Text>
                      </View>
                    )}
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Location toggle button - switches between gym and current GPS */}
          <TouchableOpacity 
            style={[
              styles.myLocationButton, 
              { 
                backgroundColor: isDark ? '#1A1A2E' : 'white',
                borderWidth: locationMode === 'current' ? 2 : 0,
                borderColor: '#FF6B35',
              }
            ]}
            onPress={async () => {
              const newLocation = await toggleLocationMode();
              
              // Animate map to new location
              if (newLocation) {
                mapRef.current?.animateToRegion({
                  latitude: newLocation.lat,
                  longitude: newLocation.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }, 500);
              }
            }}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <ActivityIndicator size={22} color="#FF6B35" />
            ) : (
              <MaterialCommunityIcons 
                name={locationMode === 'current' ? 'crosshairs-gps' : 'dumbbell'} 
                size={22} 
                color="#FF6B35" 
              />
            )}
          </TouchableOpacity>
          
          {/* Location mode indicator */}
          <View style={[styles.locationIndicator, { backgroundColor: isDark ? '#1A1A2E' : 'white' }]}>
            <MaterialCommunityIcons 
              name={locationMode === 'current' ? 'crosshairs-gps' : 'dumbbell'} 
              size={12} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {locationMode === 'current' ? 'Hier' : 'Mijn gym'}
            </Text>
          </View>

          {/* Session count badge */}
          <View style={[styles.mapSessionCount, { backgroundColor: isDark ? '#1A1A2E' : 'white' }]}>
            <MaterialCommunityIcons name="calendar-multiple" size={16} color="#FF6B35" />
            <Text style={[styles.mapSessionCountText, { color: theme.colors.onBackground }]}>
              {sessions.length} sessie{sessions.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Empty state overlay */}
          {sessions.length === 0 && (
            <View style={[styles.noSessionsOverlay, { backgroundColor: isDark ? '#1A1A2E' : 'white' }]}>
              <MaterialCommunityIcons name="calendar-search" size={24} color="#FF6B35" />
              <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, marginLeft: 10 }}>
                Geen sessies in de buurt
              </Text>
            </View>
          )}

          {/* Floating preview card */}
          {mapPreviewSession && (
            <View style={styles.mapPreviewContainer}>
              <TouchableOpacity 
                style={[styles.mapPreviewCard, { backgroundColor: isDark ? '#1A1A2E' : 'white' }]}
                onPress={() => {
                  setSelectedSession(mapPreviewSession);
                  setMapPreviewSession(null);
                }}
                activeOpacity={0.95}
              >
                {/* Colored top bar */}
                <LinearGradient
                  colors={getWorkoutStyle(mapPreviewSession.workoutType).gradient}
                  style={styles.previewTopBar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                
                <View style={styles.previewContent}>
                  {/* Close button */}
                  <TouchableOpacity 
                    style={styles.previewCloseButton}
                    onPress={() => setMapPreviewSession(null)}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                  
                  {/* Header */}
                  <View style={styles.previewHeader}>
                    <View style={[
                      styles.previewWorkoutIcon, 
                      { backgroundColor: getWorkoutStyle(mapPreviewSession.workoutType).gradient[0] + '20' }
                    ]}>
                      <MaterialCommunityIcons 
                        name={getWorkoutStyle(mapPreviewSession.workoutType).icon as any} 
                        size={24} 
                        color={getWorkoutStyle(mapPreviewSession.workoutType).gradient[0]} 
                      />
                    </View>
                    <View style={styles.previewHeaderText}>
                      <Text variant="titleMedium" style={[styles.previewTitle, { color: theme.colors.onBackground }]} numberOfLines={1}>
                        {mapPreviewSession.title}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {mapPreviewSession.owner?.name || 'Onbekend'}
                      </Text>
                    </View>
                    {/* Status/Time */}
                    {getSessionStatus(mapPreviewSession) === 'ongoing' ? (
                      <View style={[styles.previewBadge, { backgroundColor: '#00C853' }]}>
                        <Text style={styles.previewBadgeText}>LIVE</Text>
                      </View>
                    ) : getTimeUntil(mapPreviewSession.startTime) ? (
                      <View style={[styles.previewBadge, { backgroundColor: getWorkoutStyle(mapPreviewSession.workoutType).gradient[0] }]}>
                        <Text style={styles.previewBadgeText}>{getTimeUntil(mapPreviewSession.startTime)}</Text>
                      </View>
                    ) : null}
                  </View>
                  
                  {/* Info row */}
                  <View style={styles.previewInfoRow}>
                    <View style={styles.previewInfoItem}>
                      <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }} numberOfLines={1}>
                        {mapPreviewSession.gymName}
                      </Text>
                    </View>
                    <View style={styles.previewInfoItem}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                        {formatDate(mapPreviewSession.startTime)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Footer */}
                  <View style={styles.previewFooter}>
                    <View style={styles.previewChips}>
                      <View style={[
                        styles.previewChip, 
                        { backgroundColor: getWorkoutStyle(mapPreviewSession.workoutType).gradient[0] + '15' }
                      ]}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: getWorkoutStyle(mapPreviewSession.workoutType).gradient[0] }}>
                          {getLabel(WORKOUT_TYPES, mapPreviewSession.workoutType)}
                        </Text>
                      </View>
                      <View style={[styles.previewChip, { backgroundColor: isDark ? '#252536' : '#F0F0F0' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: theme.colors.onSurfaceVariant }}>
                          {mapPreviewSession.slotsAvailable}/{mapPreviewSession.slots} plekken
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.previewViewButton}
                      onPress={() => {
                        setSelectedSession(mapPreviewSession);
                        setMapPreviewSession(null);
                      }}
                    >
                      <LinearGradient
                        colors={['#FF6B35', '#FF3D00']}
                        style={styles.previewViewGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.previewViewText}>Bekijk</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color="white" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={sessions.filter(s => s.myJoinStatus !== 'declined')}
          renderItem={renderSessionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['rgba(255,107,53,0.1)', 'rgba(255,107,53,0.05)']}
                style={styles.emptyIconContainer}
              >
                <MaterialCommunityIcons name="calendar-search" size={48} color="#FF6B35" />
              </LinearGradient>
              <Text variant="titleLarge" style={{ marginTop: 20, color: theme.colors.onBackground, fontWeight: '700' }}>
                Geen sessies gevonden
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}
              >
                Er zijn nog geen sessies gepland in jouw omgeving. Maak er zelf een aan!
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton} 
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/create')}
              >
                <LinearGradient
                  colors={['#FF6B35', '#FF3D00']}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="white" />
                  <Text style={styles.emptyButtonText}>Sessie aanmaken</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      </>
      )}

      {/* My Sessions View */}
      {mainTab === 'mine' && (
        <>
          {/* Professional Filter tabs */}
          <View style={styles.mineFilterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              <TouchableOpacity
                style={[styles.filterChip, sessionFilter === 'all' && styles.filterChipActive]}
                onPress={() => setSessionFilter('all')}
              >
                <MaterialCommunityIcons 
                  name="view-grid" 
                  size={16} 
                  color={sessionFilter === 'all' ? 'white' : theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.filterChipText, sessionFilter === 'all' && styles.filterChipTextActive]}>
                  Alle
                </Text>
                <View style={[styles.filterCount, sessionFilter === 'all' && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, sessionFilter === 'all' && styles.filterCountTextActive]}>
                    {mySessions.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, sessionFilter === 'upcoming' && styles.filterChipActive]}
                onPress={() => setSessionFilter('upcoming')}
              >
                <MaterialCommunityIcons 
                  name="calendar-clock" 
                  size={16} 
                  color={sessionFilter === 'upcoming' ? 'white' : theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.filterChipText, sessionFilter === 'upcoming' && styles.filterChipTextActive]}>
                  Actief
                </Text>
                <View style={[styles.filterCount, sessionFilter === 'upcoming' && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, sessionFilter === 'upcoming' && styles.filterCountTextActive]}>
                    {mySessions.filter(s => getSessionStatus(s) !== 'past').length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, sessionFilter === 'past' && styles.filterChipActive]}
                onPress={() => setSessionFilter('past')}
              >
                <MaterialCommunityIcons 
                  name="history" 
                  size={16} 
                  color={sessionFilter === 'past' ? 'white' : theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.filterChipText, sessionFilter === 'past' && styles.filterChipTextActive]}>
                  Afgelopen
                </Text>
                <View style={[styles.filterCount, sessionFilter === 'past' && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, sessionFilter === 'past' && styles.filterCountTextActive]}>
                    {mySessions.filter(s => getSessionStatus(s) === 'past').length}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Joined sessions tab */}
              <TouchableOpacity
                style={[styles.filterChip, sessionFilter === 'joined' && styles.filterChipActive, { backgroundColor: sessionFilter === 'joined' ? '#7C4DFF' : undefined }]}
                onPress={() => setSessionFilter('joined')}
              >
                <MaterialCommunityIcons 
                  name="account-arrow-right" 
                  size={16} 
                  color={sessionFilter === 'joined' ? 'white' : theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.filterChipText, sessionFilter === 'joined' && styles.filterChipTextActive]}>
                  Gejoind
                </Text>
                <View style={[styles.filterCount, sessionFilter === 'joined' && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, sessionFilter === 'joined' && styles.filterCountTextActive]}>
                    {joinedSessions.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Stats overview */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
              <LinearGradient
                colors={['rgba(255,107,53,0.1)', 'rgba(255,107,53,0.05)']}
                style={styles.statIconBg}
              >
                <MaterialCommunityIcons name="calendar-check" size={20} color="#FF6B35" />
              </LinearGradient>
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.onBackground }]}>
                {mySessions.filter(s => getSessionStatus(s) !== 'past').length}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Actief</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
              <LinearGradient
                colors={['rgba(0,200,83,0.1)', 'rgba(0,200,83,0.05)']}
                style={styles.statIconBg}
              >
                <MaterialCommunityIcons name="account-group" size={20} color="#00C853" />
              </LinearGradient>
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.onBackground }]}>
                {mySessions.reduce((acc, s) => acc + (s.joinRequests?.filter(r => r.status === 'accepted').length || 0), 0)}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Deelnemers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
              <LinearGradient
                colors={['rgba(124,77,255,0.1)', 'rgba(124,77,255,0.05)']}
                style={styles.statIconBg}
              >
                <MaterialCommunityIcons name="account-clock" size={20} color="#7C4DFF" />
              </LinearGradient>
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.onBackground }]}>
                {pendingRequestsCount}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Wachtend</Text>
            </View>
          </View>

          <FlatList
            data={filteredMySessions}
            renderItem={sessionFilter === 'joined' ? renderJoinedSessionCard : renderMySessionCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={sessionFilter === 'joined' ? ['rgba(124,77,255,0.1)', 'rgba(124,77,255,0.05)'] : ['rgba(255,107,53,0.1)', 'rgba(255,107,53,0.05)']}
                  style={styles.emptyIconContainer}
                >
                  <MaterialCommunityIcons 
                    name={sessionFilter === 'joined' ? 'account-arrow-right' : sessionFilter === 'past' ? 'history' : 'calendar-plus'} 
                    size={48} 
                    color={sessionFilter === 'joined' ? '#7C4DFF' : '#FF6B35'} 
                  />
                </LinearGradient>
                <Text variant="titleLarge" style={{ marginTop: 20, color: theme.colors.onBackground, fontWeight: '700' }}>
                  {sessionFilter === 'joined' 
                    ? 'Nog geen sessies gejoind' 
                    : sessionFilter === 'past' 
                      ? 'Geen afgelopen sessies' 
                      : 'Geen sessies gepland'}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}
                >
                  {sessionFilter === 'joined'
                    ? 'Sessies waar je aan meedoet verschijnen hier. Zoek sessies in de buurt om mee te doen!'
                    : sessionFilter === 'past' 
                      ? 'Je afgelopen sessies verschijnen hier.'
                      : 'Maak je eerste sessie aan en nodig gym buddies uit!'}
                </Text>
                {sessionFilter !== 'past' && sessionFilter !== 'joined' && (
                  <TouchableOpacity 
                    style={styles.emptyButton} 
                    activeOpacity={0.8}
                    onPress={() => router.push('/(tabs)/create')}
                  >
                    <LinearGradient
                      colors={['#FF6B35', '#FF3D00']}
                      style={styles.emptyButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color="white" />
                      <Text style={styles.emptyButtonText}>Nieuwe sessie</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {sessionFilter === 'joined' && (
                  <TouchableOpacity 
                    style={styles.emptyButton} 
                    activeOpacity={0.8}
                    onPress={() => setMainTab('nearby')}
                  >
                    <LinearGradient
                      colors={['#7C4DFF', '#651FFF']}
                      style={styles.emptyButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialCommunityIcons name="map-search" size={20} color="white" />
                      <Text style={styles.emptyButtonText}>Zoek sessies</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        </>
      )}

      <Portal>
        <Modal
          visible={!!selectedSession}
          onDismiss={() => setSelectedSession(null)}
          contentContainerStyle={[styles.sessionModal, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
        >
          {selectedSession && (() => {
            const workoutStyle = getWorkoutStyle(selectedSession.workoutType);
            const status = getSessionStatus(selectedSession);
            return (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                {/* Header with gradient accent */}
                <LinearGradient
                  colors={workoutStyle.gradient}
                  style={styles.modalHeader}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.modalHeaderContent}>
                    <View style={styles.modalIconContainer}>
                      <MaterialCommunityIcons name={workoutStyle.icon as any} size={28} color="white" />
                    </View>
                    <TouchableOpacity 
                      style={styles.modalCloseButton}
                      onPress={() => setSelectedSession(null)}
                    >
                      <MaterialCommunityIcons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Status badge */}
                  <View style={styles.modalStatusBadge}>
                    <MaterialCommunityIcons 
                      name={status === 'ongoing' ? 'play-circle' : status === 'upcoming' ? 'clock-outline' : 'check-circle'} 
                      size={14} 
                      color="white" 
                    />
                    <Text style={styles.modalStatusText}>
                      {status === 'ongoing' ? 'NU BEZIG' : status === 'upcoming' ? 'GEPLAND' : 'AFGELOPEN'}
                    </Text>
                  </View>
                  
                  <Text variant="headlineSmall" style={styles.modalTitle}>
                    {selectedSession.title}
                  </Text>
                </LinearGradient>

                {/* Content */}
                <View style={styles.modalBody}>
                  {/* Owner info */}
                  <View style={styles.modalOwnerCard}>
                    {selectedSession.owner?.avatarUrl ? (
                      <Avatar.Image size={48} source={{ uri: selectedSession.owner.avatarUrl }} />
                    ) : (
                      <Avatar.Text
                        size={48}
                        label={selectedSession.owner?.name?.substring(0, 2).toUpperCase() || '??'}
                        style={{ backgroundColor: workoutStyle.gradient[0] }}
                      />
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        {selectedSession.owner?.name || 'Onbekend'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Organisator
                      </Text>
                    </View>
                  </View>

                  {/* Info cards */}
                  <View style={styles.modalInfoGrid}>
                    <View style={[styles.modalInfoCard, { backgroundColor: isDark ? '#252536' : '#F5F5F5' }]}>
                      <MaterialCommunityIcons name="map-marker" size={20} color={workoutStyle.gradient[0]} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Locatie</Text>
                      <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onBackground }} numberOfLines={1}>
                        {selectedSession.gymName}
                      </Text>
                    </View>
                    <View style={[styles.modalInfoCard, { backgroundColor: isDark ? '#252536' : '#F5F5F5' }]}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color={workoutStyle.gradient[0]} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Tijd</Text>
                      <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onBackground }}>
                        {formatDate(selectedSession.startTime)}
                      </Text>
                    </View>
                    <View style={[styles.modalInfoCard, { backgroundColor: isDark ? '#252536' : '#F5F5F5' }]}>
                      <MaterialCommunityIcons name="timer-outline" size={20} color={workoutStyle.gradient[0]} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Duur</Text>
                      <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onBackground }}>
                        {selectedSession.durationMinutes} min
                      </Text>
                    </View>
                    <View style={[styles.modalInfoCard, { backgroundColor: isDark ? '#252536' : '#F5F5F5' }]}>
                      <MaterialCommunityIcons name="account-multiple" size={20} color={workoutStyle.gradient[0]} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Plekken</Text>
                      <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onBackground }}>
                        {selectedSession.slotsAvailable}/{selectedSession.slots}
                      </Text>
                    </View>
                  </View>

                  {/* Workout type chips */}
                  <View style={styles.modalChipsRow}>
                    <View style={[styles.modalWorkoutChip, { backgroundColor: workoutStyle.gradient[0] + '20' }]}>
                      <MaterialCommunityIcons name={workoutStyle.icon as any} size={16} color={workoutStyle.gradient[0]} />
                      <Text style={[styles.modalChipText, { color: workoutStyle.gradient[0] }]}>
                        {getLabel(WORKOUT_TYPES, selectedSession.workoutType)}
                      </Text>
                    </View>
                    <View style={[styles.modalWorkoutChip, { backgroundColor: isDark ? '#252536' : '#F0F0F0' }]}>
                      <MaterialCommunityIcons name="speedometer" size={16} color={theme.colors.onSurfaceVariant} />
                      <Text style={[styles.modalChipText, { color: theme.colors.onSurfaceVariant }]}>
                        {getLabel(INTENSITIES, selectedSession.intensity)}
                      </Text>
                    </View>
                  </View>

                  {/* Notes */}
                  {selectedSession.notes && (
                    <View style={[styles.modalNotes, { backgroundColor: isDark ? '#252536' : '#F9F9F9' }]}>
                      <MaterialCommunityIcons name="note-text" size={18} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 10, flex: 1 }}>
                        {selectedSession.notes}
                      </Text>
                    </View>
                  )}

                  {/* Action button */}
                  <View style={styles.modalActions}>
                    {selectedSession.myRequestStatus === 'pending' ? (
                      <View style={[styles.modalActionButton, { backgroundColor: '#FFF3E0' }]}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color="#FF6B35" />
                        <Text style={[styles.modalActionText, { color: '#FF6B35' }]}>Verzoek verzonden</Text>
                      </View>
                    ) : selectedSession.myRequestStatus === 'accepted' ? (
                      <View style={[styles.modalActionButton, { backgroundColor: '#E8F5E9' }]}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#00C853" />
                        <Text style={[styles.modalActionText, { color: '#00C853' }]}>Je doet mee!</Text>
                      </View>
                    ) : selectedSession.slotsAvailable > 0 ? (
                      <TouchableOpacity 
                        style={styles.modalJoinButton}
                        onPress={() => handleRequestJoin(selectedSession)}
                        disabled={requestingJoin}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={workoutStyle.gradient}
                          style={styles.modalJoinGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {requestingJoin ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="plus" size={20} color="white" />
                              <Text style={styles.modalJoinText}>Vraag om mee te doen</Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.modalActionButton, { backgroundColor: isDark ? '#252536' : '#F0F0F0' }]}>
                        <MaterialCommunityIcons name="account-off" size={20} color={theme.colors.onSurfaceVariant} />
                        <Text style={[styles.modalActionText, { color: theme.colors.onSurfaceVariant }]}>Geen plekken meer</Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            );
          })()}
        </Modal>

        {/* Edit Session Modal */}
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={[styles.sessionModal, { backgroundColor: theme.colors.surface, padding: 24 }]}
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
          contentContainerStyle={[styles.sessionModal, { backgroundColor: theme.colors.surface, padding: 24 }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header styles
  headerGradient: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
  },
  notificationBadge: {
    backgroundColor: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: 'white',
  },
  tabText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FF6B35',
  },
  tabBadge: {
    backgroundColor: '#FF1744',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  viewModeButtonActive: {
    backgroundColor: 'rgba(255,107,53,0.1)',
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
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
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
    paddingBottom: 120,
  },
  // Session Card Styles
  sessionCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  sessionTitle: {
    fontWeight: '700',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  timeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  joinStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  joinStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 10,
  },
  cardInfoSection: {
    gap: 8,
    marginBottom: 12,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  cardChips: {
    flexDirection: 'row',
    gap: 8,
  },
  workoutChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  workoutChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  intensityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  intensityChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  slotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotsBar: {
    width: 40,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  slotsFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  // My Sessions specific styles  
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  // New My Sessions Card Styles
  mySessionCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  myCardTopBar: {
    height: 4,
  },
  myCardContent: {
    padding: 16,
  },
  myCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
  },
  myCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  myWorkoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myCardTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  myCardInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  myCardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  participantsProgress: {
    marginBottom: 4,
  },
  participantsLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  avatarStack: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stackedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  pendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#00C853',
    marginRight: 8,
  },
  declineButton: {
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  // Mijn Sessies Filter & Stats
  mineFilterContainer: {
    paddingVertical: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  filterCount: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  filterCountTextActive: {
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontWeight: '800',
  },
  // Professional Modal Styles
  modalHeader: {
    padding: 18,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  modalStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 22,
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  modalOwnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modalInfoCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  modalChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modalWorkoutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalNotes: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  modalActions: {
    marginTop: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalJoinButton: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 54,
  },
  modalJoinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 54,
    gap: 10,
  },
  modalJoinText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  // Map Styles
  userMarkerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
  customMarkerContainer: {
    alignItems: 'center',
  },
  markerPulse: {
    position: 'absolute',
    top: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 200, 83, 0.3)',
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  customMarkerSelected: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'white',
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  markerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  markerBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  myLocationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  locationIndicator: {
    position: 'absolute',
    top: 68,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapSessionCount: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: 6,
  },
  mapSessionCountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Map Preview Card
  mapPreviewContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  mapPreviewCard: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  previewTopBar: {
    height: 4,
  },
  previewContent: {
    padding: 16,
  },
  previewCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 32,
  },
  previewWorkoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewHeaderText: {
    flex: 1,
  },
  previewTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  previewInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  previewInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewChips: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  previewChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewViewButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  previewViewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  previewViewText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  sessionModal: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '94%',
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



