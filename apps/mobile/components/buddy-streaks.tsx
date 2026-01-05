import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { Text, Avatar, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, BuddyStreak } from '@/lib/api';

interface BuddyStreaksProps {
  onLogWorkout?: (matchId: string) => void;
}

export default function BuddyStreaksSection({ onLogWorkout }: BuddyStreaksProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [streaks, setStreaks] = useState<BuddyStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingWorkout, setLoggingWorkout] = useState<string | null>(null);

  useEffect(() => {
    loadStreaks();
  }, []);

  const loadStreaks = async () => {
    try {
      const response = await api.getBuddyStreaks();
      setStreaks(response.data);
    } catch (error) {
      console.error('Load streaks error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWorkout = async (matchId: string, buddyName: string) => {
    setLoggingWorkout(matchId);
    try {
      const response = await api.logBuddyWorkout(matchId);
      Alert.alert('🔥 Streak!', response.data.message);
      loadStreaks(); // Refresh
      onLogWorkout?.(matchId);
    } catch (error: any) {
      Alert.alert('Oeps', error.message || 'Kon workout niet loggen');
    } finally {
      setLoggingWorkout(null);
    }
  };

  const getStreakBadge = (streak: number) => {
    if (streak >= 30) return { icon: 'fire', color: '#FFD700', label: 'GOLD' };
    if (streak >= 7) return { icon: 'fire', color: '#FF6B35', label: 'HOT' };
    if (streak >= 3) return { icon: 'fire', color: '#FF9800', label: 'WARM' };
    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <ActivityIndicator size="small" color="#FF6B35" />
      </View>
    );
  }

  if (streaks.length === 0) {
    return null; // Don't show if no streaks
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="fire" size={24} color="#FF6B35" />
        <Text style={[styles.title, isDark && styles.textLight]}>Buddy Streaks</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {streaks.map((streak) => {
          const badge = getStreakBadge(streak.currentStreak);
          
          return (
            <TouchableOpacity
              key={streak.id}
              style={[styles.streakCard, isDark && styles.cardDark]}
              onPress={() => handleLogWorkout(streak.id, streak.buddy.name)}
              disabled={loggingWorkout === streak.id}
            >
              {badge && (
                <View style={[styles.badge, { backgroundColor: badge.color }]}>
                  <Text style={styles.badgeText}>{badge.label}</Text>
                </View>
              )}
              
              <Avatar.Image
                source={{ uri: streak.buddy.avatarUrl || 'https://via.placeholder.com/60' }}
                size={50}
                style={styles.avatar}
              />
              
              <Text style={[styles.buddyName, isDark && styles.textLight]} numberOfLines={1}>
                {streak.buddy.name}
              </Text>
              
              <View style={styles.streakRow}>
                <MaterialCommunityIcons 
                  name="fire" 
                  size={20} 
                  color={streak.currentStreak > 0 ? '#FF6B35' : '#ccc'} 
                />
                <Text style={[styles.streakCount, streak.currentStreak > 0 && styles.activeStreak]}>
                  {streak.currentStreak}
                </Text>
              </View>

              <Text style={[styles.totalWorkouts, isDark && styles.textMuted]}>
                {streak.totalWorkouts} workouts samen
              </Text>

              {loggingWorkout === streak.id ? (
                <ActivityIndicator size="small" color="#FF6B35" style={styles.logButton} />
              ) : (
                <LinearGradient
                  colors={['#FF6B35', '#FF3D00']}
                  style={styles.logButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="plus" size={14} color="white" />
                  <Text style={styles.logButtonText}>Log</Text>
                </LinearGradient>
              )}
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
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  streakCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },
  avatar: {
    marginBottom: 8,
  },
  buddyName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ccc',
  },
  activeStreak: {
    color: '#FF6B35',
  },
  totalWorkouts: {
    fontSize: 11,
    color: '#888',
    marginBottom: 10,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  logButtonText: {
    color: 'white',
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

