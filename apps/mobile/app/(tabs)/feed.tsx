import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, PanResponder, Image, useColorScheme } from 'react-native';
import { Text, Button, useTheme, IconButton, Chip, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { api, UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getLabel, GOALS, LEVELS, WEEKDAYS, TIME_SLOTS } from '@/lib/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;

export default function FeedScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likesRemaining, setLikesRemaining] = useState(user?.likesRemaining || 10);
  const [matchModal, setMatchModal] = useState<UserProfile | null>(null);

  const position = useState(new Animated.ValueXY())[0];
  const cardScale = useRef(new Animated.Value(1)).current;
  
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
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

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.92, 1],
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
    onPanResponderGrant: () => {
      Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true }).start();
    },
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
    },
    onPanResponderRelease: (_, gesture) => {
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true }).start();
      
      if (gesture.dx > SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
          duration: 250,
          useNativeDriver: false,
        }).start(() => handleSwipe('right'));
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
          duration: 250,
          useNativeDriver: false,
        }).start(() => handleSwipe('left'));
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 5,
        }).start();
      }
    },
  });

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
        <SafeAreaView style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <LinearGradient
              colors={['#FF6B35', '#FF3D00']}
              style={styles.loadingIcon}
            >
              <MaterialCommunityIcons name="dumbbell" size={32} color="white" />
            </LinearGradient>
            <Text variant="titleMedium" style={{ marginTop: 20, color: theme.colors.onBackground }}>
              Gym buddies zoeken...
            </Text>
            <ActivityIndicator size="small" style={{ marginTop: 16 }} color={theme.colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#FF6B35', '#FF3D00']}
                style={styles.headerLogo}
              >
                <MaterialCommunityIcons name="fire" size={20} color="white" />
              </LinearGradient>
              <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
                Ontdek
              </Text>
            </View>
          </View>
          
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,107,53,0.1)' : 'rgba(255,107,53,0.1)' }]}>
              <MaterialCommunityIcons name="account-search" size={60} color={theme.colors.primary} />
            </View>
            <Text variant="headlineSmall" style={{ marginTop: 24, color: theme.colors.onBackground, fontWeight: '700' }}>
              Klaar voor vandaag!
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}>
              Je hebt alle profielen bekeken. Kom later terug voor nieuwe matches!
            </Text>
            <Button 
              mode="contained" 
              onPress={loadProfiles} 
              style={styles.refreshButton}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontWeight: '600' }}
            >
              Vernieuwen
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#FF6B35', '#FF3D00']}
              style={styles.headerLogo}
            >
              <MaterialCommunityIcons name="fire" size={20} color="white" />
            </LinearGradient>
            <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
              Ontdek
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.likesContainer, { backgroundColor: isDark ? 'rgba(255,107,53,0.15)' : 'rgba(255,107,53,0.1)' }]}>
              <MaterialCommunityIcons name="heart" size={16} color={theme.colors.primary} />
              <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 4 }}>
                {likesRemaining}
              </Text>
            </View>
          </View>
        </View>

        {/* Cards */}
        <View style={styles.cardContainer}>
          {profiles.slice(currentIndex, currentIndex + 2).reverse().map((profile, index) => {
            const isFirst = index === profiles.slice(currentIndex, currentIndex + 2).length - 1;
            
            return (
              <Animated.View
                key={profile.id}
                style={[
                  styles.card,
                  { 
                    backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
                    shadowColor: isDark ? '#000' : '#000',
                  },
                  isFirst ? {
                    transform: [
                      { translateX: position.x }, 
                      { translateY: position.y },
                      { rotate },
                      { scale: cardScale }
                    ],
                  } : {
                    transform: [{ scale: nextCardScale }],
                  },
                ]}
                {...(isFirst ? panResponder.panHandlers : {})}
              >
                {isFirst && (
                  <>
                    <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
                      <LinearGradient
                        colors={['#00C853', '#00E676']}
                        style={styles.swipeLabel}
                      >
                        <MaterialCommunityIcons name="heart" size={28} color="white" />
                        <Text style={styles.swipeLabelText}>LIKE</Text>
                      </LinearGradient>
                    </Animated.View>
                    <Animated.View style={[styles.passLabel, { opacity: passOpacity }]}>
                      <LinearGradient
                        colors={['#FF1744', '#FF5252']}
                        style={styles.swipeLabel}
                      >
                        <MaterialCommunityIcons name="close" size={28} color="white" />
                        <Text style={styles.swipeLabelText}>NOPE</Text>
                      </LinearGradient>
                    </Animated.View>
                  </>
                )}

                {/* Profile Image */}
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.profileImage} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={isDark ? ['#252536', '#1A1A2E'] : ['#F5F5F5', '#EEEEEE']}
                    style={styles.avatarPlaceholder}
                  >
                    <MaterialCommunityIcons name="account" size={80} color={theme.colors.primary} />
                  </LinearGradient>
                )}

                {/* Gradient overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.cardGradient}
                />

                {/* Card Content */}
                <View style={styles.cardContent}>
                  {/* Match Score Badge */}
                  <View style={styles.matchBadge}>
                    <LinearGradient
                      colors={['#FF6B35', '#FF3D00']}
                      style={styles.matchBadgeGradient}
                    >
                      <MaterialCommunityIcons name="fire" size={14} color="white" />
                      <Text style={styles.matchBadgeText}>{profile.compatibilityScore}%</Text>
                    </LinearGradient>
                  </View>

                  {/* Name & Verification */}
                  <View style={styles.nameRow}>
                    <Text variant="headlineMedium" style={styles.name}>
                      {profile.name}
                    </Text>
                    {profile.verificationScore >= 80 && (
                      <MaterialCommunityIcons name="check-decagram" size={24} color="#00C853" />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.infoText}>
                        {profile.gymName || 'Geen gym'}{profile.distance ? ` • ${profile.distance}km` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <MaterialCommunityIcons name="arm-flex" size={14} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.infoText}>{getLabel(LEVELS, profile.level || '')}</Text>
                    </View>
                  </View>

                  {/* Goals */}
                  <View style={styles.chipRow}>
                    {profile.goals.slice(0, 3).map((goal, i) => (
                      <View key={goal} style={[styles.goalChip, { backgroundColor: getGoalColor(i) }]}>
                        <Text style={styles.goalChipText}>{getLabel(GOALS, goal)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Bio */}
                  {profile.bio && (
                    <Text numberOfLines={2} style={styles.bio}>
                      {profile.bio}
                    </Text>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <ActionButton
            icon="close"
            color="#FF1744"
            size={28}
            onPress={() => handleSwipe('left')}
          />
          <ActionButton
            icon="star"
            color="#FFB800"
            size={24}
            onPress={() => {}}
            small
          />
          <ActionButton
            icon="heart"
            color="#00C853"
            size={28}
            onPress={() => handleSwipe('right')}
          />
        </View>

        {/* Match Modal */}
        <Portal>
          <Modal
            visible={!!matchModal}
            onDismiss={() => setMatchModal(null)}
            contentContainerStyle={[styles.matchModal, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF3D00']}
              style={styles.matchModalIcon}
            >
              <MaterialCommunityIcons name="heart-multiple" size={40} color="white" />
            </LinearGradient>
            <Text variant="displaySmall" style={{ marginTop: 20, fontWeight: 'bold', color: theme.colors.onBackground }}>
              It's a Match! 🎉
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
              Jij en {matchModal?.name} willen samen trainen!
            </Text>
            <LinearGradient
              colors={['#FF6B35', '#FF3D00']}
              style={styles.matchModalButton}
            >
              <Button mode="text" onPress={() => setMatchModal(null)} textColor="white" labelStyle={{ fontWeight: '700' }}>
                Stuur een bericht 💬
              </Button>
            </LinearGradient>
            <Button mode="text" onPress={() => setMatchModal(null)} style={{ marginTop: 8 }} textColor={theme.colors.onSurfaceVariant}>
              Later
            </Button>
          </Modal>
        </Portal>
      </SafeAreaView>
    </View>
  );
}

function ActionButton({ icon, color, size, onPress, small }: { icon: string; color: string; size: number; onPress: () => void; small?: boolean }) {
  return (
    <Animated.View>
      <IconButton
        icon={icon}
        size={size}
        onPress={onPress}
        style={[
          styles.actionButton,
          small && styles.actionButtonSmall,
          { backgroundColor: color + '15', borderColor: color + '30' }
        ]}
        iconColor={color}
      />
    </Animated.View>
  );
}

function getGoalColor(index: number): string {
  const colors = ['rgba(255,107,53,0.9)', 'rgba(0,200,83,0.9)', 'rgba(255,184,0,0.9)'];
  return colors[index % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    marginTop: 24,
    borderRadius: 12,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: CARD_HEIGHT,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  likeLabel: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  passLabel: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  swipeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  swipeLabelText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  matchBadge: {
    position: 'absolute',
    top: -CARD_HEIGHT + 70,
    right: 16,
  },
  matchBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  matchBadgeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  goalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goalChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bio: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  actionButtonSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  matchModal: {
    margin: 24,
    padding: 32,
    borderRadius: 28,
    alignItems: 'center',
  },
  matchModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchModalButton: {
    marginTop: 24,
    borderRadius: 16,
    width: '100%',
  },
});
