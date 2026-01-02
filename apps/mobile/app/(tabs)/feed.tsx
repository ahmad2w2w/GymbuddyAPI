import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Animated, PanResponder, Image } from 'react-native';
import { Text, Button, useTheme, IconButton, Chip, Card, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api, UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getLabel, GOALS, LEVELS, WEEKDAYS, TIME_SLOTS } from '@/lib/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export default function FeedScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likesRemaining, setLikesRemaining] = useState(user?.likesRemaining || 10);
  const [matchModal, setMatchModal] = useState<UserProfile | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  const position = useState(new Animated.ValueXY())[0];
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      let lat = user?.lat;
      let lng = user?.lng;

      if (!lat || !lng) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }
      }

      const response = await api.getFeed({
        lat: lat || 52.3676,
        lng: lng || 4.9041,
        radiusKm: user?.preferredRadius || 10,
      });

      if (response.success) {
        setProfiles(response.data.items);
        setLikesRemaining(response.data.likesRemaining);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Load profiles error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    try {
      if (direction === 'right') {
        const response = await api.like(currentProfile.id);
        if (response.success) {
          setLikesRemaining(response.data.likesRemaining);
          if (response.data.isMatch) {
            setMatchModal(currentProfile);
          }
        }
      } else {
        await api.pass(currentProfile.id);
      }
    } catch (error) {
      console.error('Swipe error:', error);
    }

    setCurrentIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        Animated.spring(position, {
          toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
          useNativeDriver: false,
        }).start(() => handleSwipe('right'));
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        Animated.spring(position, {
          toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
          useNativeDriver: false,
        }).start(() => handleSwipe('left'));
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={{ marginTop: 16 }}>
            Profielen laden...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            GymBuddy
          </Text>
          <IconButton icon="tune" onPress={() => setFilterVisible(true)} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="emoticon-sad-outline"
            size={80}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleLarge" style={{ marginTop: 16 }}>
            Geen profielen meer
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
          >
            Je hebt alle profielen in je omgeving bekeken. Kom later terug of pas je filters aan.
          </Text>
          <Button mode="contained" onPress={loadProfiles} style={{ marginTop: 24 }}>
            Vernieuw
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          GymBuddy
        </Text>
        <View style={styles.headerRight}>
          <Chip icon="heart" compact style={styles.likesChip}>
            {likesRemaining}
          </Chip>
          <IconButton icon="tune" onPress={() => setFilterVisible(true)} />
        </View>
      </View>

      <View style={styles.cardContainer}>
        {profiles.slice(currentIndex, currentIndex + 2).reverse().map((profile, index) => {
          const isFirst = index === profiles.slice(currentIndex, currentIndex + 2).length - 1;
          
          return (
            <Animated.View
              key={profile.id}
              style={[
                styles.card,
                { backgroundColor: theme.colors.surface },
                isFirst && {
                  transform: [{ translateX: position.x }, { rotate }],
                },
              ]}
              {...(isFirst ? panResponder.panHandlers : {})}
            >
              {isFirst && (
                <>
                  <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
                    <Text style={styles.likeLabelText}>LIKE</Text>
                  </Animated.View>
                  <Animated.View style={[styles.passLabel, { opacity: passOpacity }]}>
                    <Text style={styles.passLabelText}>PASS</Text>
                  </Animated.View>
                </>
              )}

              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons
                    name="account"
                    size={80}
                    color={theme.colors.primary}
                  />
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                  <Text variant="headlineSmall" style={styles.name}>
                    {profile.name}
                  </Text>
                  <View style={styles.verificationBadge}>
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={20}
                      color={profile.verificationScore >= 80 ? theme.colors.primary : theme.colors.outline}
                    />
                    <Text variant="bodySmall">{profile.verificationScore}%</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="dumbbell" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {profile.gymName || 'Geen gym'}
                    {profile.distance ? ` • ${profile.distance} km` : ''}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="chart-line" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {getLabel(LEVELS, profile.level || '')}
                  </Text>
                </View>

                <View style={styles.compatibilityRow}>
                  <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                    {profile.compatibilityScore}% match
                  </Text>
                </View>

                {profile.bio && (
                  <Text variant="bodyMedium" numberOfLines={2} style={styles.bio}>
                    {profile.bio}
                  </Text>
                )}

                <View style={styles.chipRow}>
                  {profile.goals.slice(0, 3).map((goal) => (
                    <Chip key={goal} compact style={styles.goalChip}>
                      {getLabel(GOALS, goal)}
                    </Chip>
                  ))}
                </View>

                {profile.availability.length > 0 && (
                  <View style={styles.availabilityRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {profile.availability
                        .slice(0, 3)
                        .map((a) => getLabel(WEEKDAYS, a.day))
                        .join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.buttons}>
        <IconButton
          icon="close"
          size={32}
          mode="contained"
          containerColor={theme.colors.errorContainer}
          iconColor={theme.colors.error}
          onPress={() => handleSwipe('left')}
        />
        <IconButton
          icon="star"
          size={24}
          mode="contained"
          containerColor={theme.colors.tertiaryContainer}
          iconColor={theme.colors.tertiary}
          onPress={() => {}}
        />
        <IconButton
          icon="heart"
          size={32}
          mode="contained"
          containerColor={theme.colors.primaryContainer}
          iconColor={theme.colors.primary}
          onPress={() => handleSwipe('right')}
        />
      </View>

      <Portal>
        <Modal
          visible={!!matchModal}
          onDismiss={() => setMatchModal(null)}
          contentContainerStyle={[styles.matchModal, { backgroundColor: theme.colors.surface }]}
        >
          <MaterialCommunityIcons name="party-popper" size={60} color={theme.colors.primary} />
          <Text variant="headlineMedium" style={{ marginTop: 16 }}>
            It's a Match!
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            Jij en {matchModal?.name} willen samen trainen!
          </Text>
          <Button mode="contained" onPress={() => setMatchModal(null)} style={{ marginTop: 24 }}>
            Stuur een bericht
          </Button>
          <Button mode="text" onPress={() => setMatchModal(null)} style={{ marginTop: 8 }}>
            Later
          </Button>
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
    paddingVertical: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesChip: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  likeLabel: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 8,
    transform: [{ rotate: '-20deg' }],
  },
  likeLabelText: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
  },
  passLabel: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderWidth: 3,
    borderColor: '#F44336',
    borderRadius: 8,
    transform: [{ rotate: '20deg' }],
  },
  passLabelText: {
    color: '#F44336',
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatarContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontWeight: 'bold',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  compatibilityRow: {
    marginTop: 12,
  },
  bio: {
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  goalChip: {
    height: 28,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 24,
  },
  matchModal: {
    margin: 32,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
});



