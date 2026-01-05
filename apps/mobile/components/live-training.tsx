import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Animated,
} from 'react-native';
import { Text, Avatar, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api, LiveTrainingUser } from '@/lib/api';

const WORKOUT_COLORS: Record<string, string> = {
  push: '#FF6B35',
  pull: '#4ECDC4',
  legs: '#9B59B6',
  cardio: '#E74C3C',
  core: '#F39C12',
  full_body: '#1ABC9C',
};

const WORKOUT_ICONS: Record<string, string> = {
  push: 'arm-flex',
  pull: 'weight-lifter',
  legs: 'run-fast',
  cardio: 'heart-pulse',
  core: 'human',
  full_body: 'dumbbell',
};

interface LiveTrainingProps {
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export default function LiveTrainingSection({ lat, lng, radiusKm = 10 }: LiveTrainingProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [liveUsers, setLiveUsers] = useState<LiveTrainingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadLiveTraining();
    
    // Pulse animation for live indicator
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadLiveTraining, 30000);
    
    return () => {
      pulse.stop();
      clearInterval(interval);
    };
  }, [lat, lng]);

  const loadLiveTraining = async () => {
    try {
      const response = await api.getLiveTraining({ lat, lng, radiusKm });
      setLiveUsers(response.data);
    } catch (error) {
      console.error('Load live training error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (startedAt: string) => {
    const diff = Date.now() - new Date(startedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Nu';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}u ${minutes % 60}m`;
  };

  const getEstimatedRemaining = (startedAt: string, estimatedEnd?: string) => {
    if (!estimatedEnd) return null;
    const remaining = new Date(estimatedEnd).getTime() - Date.now();
    if (remaining < 0) return 'Bijna klaar';
    const minutes = Math.floor(remaining / 60000);
    return `nog ${minutes} min`;
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  }

  if (liveUsers.length === 0) {
    return null; // Don't show if no one training
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={[styles.title, isDark && styles.textLight]}>Nu aan het trainen</Text>
        <Text style={[styles.count, isDark && styles.textMuted]}>({liveUsers.length})</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {liveUsers.map((training) => {
          const color = WORKOUT_COLORS[training.workoutType] || '#FF6B35';
          const icon = WORKOUT_ICONS[training.workoutType] || 'dumbbell';
          const remaining = getEstimatedRemaining(training.startedAt, training.estimatedEnd);
          
          return (
            <TouchableOpacity
              key={training.id}
              style={[styles.card, isDark && styles.cardDark]}
              onPress={() => {
                // Could navigate to user profile or chat
                router.push(`/user/${training.user.id}`);
              }}
            >
              {/* Top accent */}
              <LinearGradient
                colors={[color, color + '80']}
                style={styles.cardAccent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              
              {/* Live badge */}
              <View style={[styles.liveBadge, { backgroundColor: color }]}>
                <MaterialCommunityIcons name={icon as any} size={12} color="white" />
              </View>

              {/* User info */}
              <View style={styles.userSection}>
                <Avatar.Image
                  source={{ uri: training.user.avatarUrl || 'https://via.placeholder.com/50' }}
                  size={50}
                />
                <Text style={[styles.userName, isDark && styles.textLight]} numberOfLines={1}>
                  {training.user.name}
                </Text>
              </View>

              {/* Workout info */}
              <View style={[styles.workoutInfo, { backgroundColor: color + '15' }]}>
                <MaterialCommunityIcons name={icon as any} size={16} color={color} />
                <Text style={[styles.workoutType, { color }]}>
                  {training.workoutType.replace('_', ' ')}
                </Text>
              </View>

              {/* Gym & time */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#888" />
                  <Text style={[styles.detailText, isDark && styles.textMuted]} numberOfLines={1}>
                    {training.gymName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#888" />
                  <Text style={[styles.detailText, isDark && styles.textMuted]}>
                    {formatTimeAgo(training.startedAt)} geleden
                  </Text>
                </View>
                {remaining && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="timer-sand" size={14} color={color} />
                    <Text style={[styles.remainingText, { color }]}>
                      {remaining}
                    </Text>
                  </View>
                )}
              </View>

              {/* Note */}
              {training.note && (
                <Text style={[styles.note, isDark && styles.textMuted]} numberOfLines={2}>
                  "{training.note}"
                </Text>
              )}

              {/* Distance */}
              {training.distance !== undefined && training.distance !== null && (
                <View style={styles.distanceBadge}>
                  <MaterialCommunityIcons name="walk" size={12} color="#888" />
                  <Text style={styles.distanceText}>{training.distance} km</Text>
                </View>
              )}

              {/* Join button */}
              <TouchableOpacity 
                style={[styles.joinButton, { backgroundColor: color + '20' }]}
                onPress={() => {
                  // Could start a chat or send notification
                }}
              >
                <MaterialCommunityIcons name="chat" size={16} color={color} />
                <Text style={[styles.joinText, { color }]}>Aansluiten?</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  containerDark: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  liveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  count: {
    fontSize: 14,
    color: '#888',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 160,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  cardAccent: {
    height: 4,
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  workoutType: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  detailsSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#888',
    flex: 1,
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  note: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#888',
    marginHorizontal: 12,
    marginTop: 8,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 50,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 10,
    color: '#888',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
});

