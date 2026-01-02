import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, useColorScheme, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { Text, useTheme, Card, Button, Chip, ProgressBar, List, Divider, Portal, Modal, Switch, IconButton, TextInput, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api, GamificationStats } from '@/lib/api';
import { getLabel, GOALS, LEVELS, TRAINING_STYLES, WEEKDAYS, TIME_SLOTS } from '@/lib/constants';
import { AvatarPicker } from '@/components/avatar-picker';
import { 
  getLevelFromXp, 
  getLevelProgress, 
  BADGES, 
  getBadge, 
  formatStreak, 
  getStreakColor, 
  getStreakFlames,
  LEVELS as GAME_LEVELS 
} from '@/lib/gamification';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  
  // Edit profile state
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editLoading, setEditLoading] = useState(false);

  // Gamification state
  const [gamificationStats, setGamificationStats] = useState<{
    xp: number;
    level: string;
    levelProgress: number;
    xpToNextLevel: number;
    currentStreak: number;
    longestStreak: number;
    totalWorkouts: number;
    badges: string[];
    checkedInToday: boolean;
  } | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [badgesModalVisible, setBadgesModalVisible] = useState(false);
  
  // Animation for check-in
  const checkInScale = useState(new Animated.Value(1))[0];

  // Load gamification stats
  const loadGamificationStats = useCallback(async () => {
    try {
      const response = await api.getGamificationStats();
      if (response.success) {
        setGamificationStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load gamification stats:', error);
    }
  }, []);

  useEffect(() => {
    loadGamificationStats();
  }, [loadGamificationStats]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (gamificationStats?.checkedInToday) {
      Alert.alert('Al ingecheckt! ✅', 'Je hebt vandaag al ingecheckt. Kom morgen terug!');
      return;
    }

    // Animate button
    Animated.sequence([
      Animated.spring(checkInScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(checkInScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setCheckInLoading(true);
    try {
      const response = await api.checkIn({
        gymName: user?.gymName || undefined,
      });
      
      if (response.success) {
        const { stats, badgesEarned, levelUp, checkIn } = response.data;
        
        // Update local state
        setGamificationStats(prev => prev ? {
          ...prev,
          ...stats,
          checkedInToday: true,
        } : null);

        // Show celebration
        let message = `+${checkIn.xpEarned} XP verdiend! 🎉`;
        
        if (levelUp) {
          const level = GAME_LEVELS.find(l => l.id === levelUp);
          message += `\n\n🎊 Level Up! Je bent nu ${level?.name}!`;
        }
        
        if (badgesEarned.length > 0) {
          const badgeNames = badgesEarned.map(id => getBadge(id)?.name).filter(Boolean);
          message += `\n\n🏆 Nieuwe badge${badgesEarned.length > 1 ? 's' : ''}: ${badgeNames.join(', ')}`;
        }

        Alert.alert('Check-in succesvol! 💪', message);
      }
    } catch (error: any) {
      if (error.message?.includes('al ingecheckt')) {
        Alert.alert('Al ingecheckt! ✅', 'Je hebt vandaag al ingecheckt.');
        setGamificationStats(prev => prev ? { ...prev, checkedInToday: true } : null);
      } else {
        Alert.alert('Fout', error.message || 'Check-in mislukt');
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Uitloggen',
      'Weet je zeker dat je wilt uitloggen?',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Uitloggen',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditBio(user?.bio || '');
    setEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Fout', 'Naam is verplicht');
      return;
    }

    setEditLoading(true);
    try {
      await api.updateProfile({
        name: editName.trim(),
        bio: editBio.trim() || null,
      });
      await refreshUser();
      setEditProfileVisible(false);
      Alert.alert('Opgeslagen', 'Je profiel is bijgewerkt');
    } catch (error: any) {
      Alert.alert('Fout', error.message || 'Kon profiel niet opslaan');
    } finally {
      setEditLoading(false);
    }
  };

  const getAvailabilityText = () => {
    if (!user?.availability || user.availability.length === 0) {
      return 'Niet ingesteld';
    }
    return user.availability
      .map((a) => `${getLabel(WEEKDAYS, a.day)}: ${a.timeSlots.map(s => TIME_SLOTS.find(t => t.value === s)?.label.split(' ')[0] || s).join(', ')}`)
      .join('\n');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        bounces={true}
      >
        {/* Header with gradient */}
        <LinearGradient
          colors={['#FF6B35', '#FF3D00']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <Text variant="titleLarge" style={styles.headerTitle}>Profiel</Text>
                <IconButton
                  icon="cog"
                  iconColor="white"
                  onPress={() => router.push('/(tabs)/settings')}
                />
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={[styles.profileCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <View style={styles.avatarSection}>
              <AvatarPicker
                currentAvatar={user?.avatarUrl || null}
                onAvatarChange={(newUrl) => refreshUser()}
                size={90}
              />
              {user?.isPremium && (
                <View style={styles.premiumBadge}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.premiumBadgeGradient}
                  >
                    <MaterialCommunityIcons name="star" size={12} color="white" />
                  </LinearGradient>
                </View>
              )}
            </View>
            
            <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.onBackground }]}>
              {user?.name}
            </Text>
            
            {user?.bio && (
              <Text variant="bodyMedium" style={[styles.bio, { color: theme.colors.onSurfaceVariant }]}>
                {user.bio}
              </Text>
            )}

            <Button
              mode="outlined"
              onPress={openEditProfile}
              style={styles.editProfileButton}
              icon="pencil"
              compact
            >
              Bewerken
            </Button>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <StatItem 
                value={gamificationStats?.xp || 0} 
                label="XP" 
                icon="star"
                color="#FFB300"
              />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
              <StatItem 
                value={gamificationStats?.totalWorkouts || 0} 
                label="Workouts" 
                icon="dumbbell"
                color="#FF6B35"
              />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
              <StatItem 
                value={gamificationStats?.badges?.length || 0} 
                label="Badges" 
                icon="trophy"
                color="#7C4DFF"
              />
            </View>
          </View>
        </View>

        {/* Streak & Check-in Card */}
        <View style={styles.section}>
          <View style={[styles.streakCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <View style={styles.streakHeader}>
              <View style={styles.streakInfo}>
                <View style={styles.streakFlames}>
                  {[...Array(getStreakFlames(gamificationStats?.currentStreak || 0))].map((_, i) => (
                    <MaterialCommunityIcons 
                      key={i} 
                      name="fire" 
                      size={24 - i * 2} 
                      color={getStreakColor(gamificationStats?.currentStreak || 0)} 
                    />
                  ))}
                  {getStreakFlames(gamificationStats?.currentStreak || 0) === 0 && (
                    <MaterialCommunityIcons name="fire" size={24} color="#757575" />
                  )}
                </View>
                <View>
                  <Text variant="headlineMedium" style={[styles.streakNumber, { color: getStreakColor(gamificationStats?.currentStreak || 0) }]}>
                    {gamificationStats?.currentStreak || 0}
                  </Text>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatStreak(gamificationStats?.currentStreak || 0)}
                  </Text>
                </View>
              </View>
              
              <Animated.View style={{ transform: [{ scale: checkInScale }] }}>
                <TouchableOpacity
                  onPress={handleCheckIn}
                  disabled={checkInLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gamificationStats?.checkedInToday 
                      ? ['#4CAF50', '#388E3C'] 
                      : ['#FF6B35', '#FF3D00']}
                    style={styles.checkInButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {checkInLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons 
                          name={gamificationStats?.checkedInToday ? "check" : "plus"} 
                          size={20} 
                          color="white" 
                        />
                        <Text style={styles.checkInText}>
                          {gamificationStats?.checkedInToday ? 'Ingecheckt!' : 'Check-in'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Level Progress */}
            <View style={styles.levelSection}>
              <View style={styles.levelHeader}>
                <Text variant="labelLarge" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                  {GAME_LEVELS.find(l => l.id === gamificationStats?.level)?.icon}{' '}
                  {GAME_LEVELS.find(l => l.id === gamificationStats?.level)?.name || 'Gym Newbie'}
                </Text>
                {gamificationStats && gamificationStats.xpToNextLevel > 0 && (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {gamificationStats.xpToNextLevel} XP tot volgende level
                  </Text>
                )}
              </View>
              <ProgressBar 
                progress={gamificationStats?.levelProgress || 0} 
                color="#FF6B35"
                style={styles.levelProgress}
              />
            </View>

            {/* Longest Streak */}
            <View style={styles.longestStreak}>
              <MaterialCommunityIcons name="trophy-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                Langste streak: {gamificationStats?.longestStreak || 0} dagen
              </Text>
            </View>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              🏆 Badges
            </Text>
            <TouchableOpacity onPress={() => setBadgesModalVisible(true)}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                Bekijk alle ({BADGES.length})
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {gamificationStats?.badges && gamificationStats.badges.length > 0 ? (
              gamificationStats.badges.slice(0, 6).map(badgeId => {
                const badge = getBadge(badgeId);
                if (!badge) return null;
                return (
                  <View key={badgeId} style={[styles.badgeItem, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                    <View style={[styles.badgeIcon, { backgroundColor: badge.color + '20' }]}>
                      <MaterialCommunityIcons name={badge.icon as any} size={24} color={badge.color} />
                    </View>
                    <Text variant="labelSmall" style={styles.badgeName} numberOfLines={1}>
                      {badge.name}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={[styles.noBadgesCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                <MaterialCommunityIcons name="trophy-outline" size={32} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  Check in om badges te verdienen!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Snel Aanpassen
          </Text>
          <View style={styles.quickActions}>
            <QuickActionCard
              icon="target"
              label="Doelen"
              color="#FF6B35"
              onPress={() => router.push('/(onboarding)/step1')}
              isDark={isDark}
            />
            <QuickActionCard
              icon="dumbbell"
              label="Gym"
              color="#00C853"
              onPress={() => router.push('/(onboarding)/step2')}
              isDark={isDark}
            />
            <QuickActionCard
              icon="clock-outline"
              label="Schema"
              color="#00B0FF"
              onPress={() => router.push('/(onboarding)/step3')}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Current Info Cards */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Mijn Fitness Info
          </Text>
          
          {/* Gym Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <View style={[styles.infoCardIcon, { backgroundColor: 'rgba(0,200,83,0.1)' }]}>
              <MaterialCommunityIcons name="dumbbell" size={24} color="#00C853" />
            </View>
            <View style={styles.infoCardContent}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Sportschool
              </Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                {user?.gymName || 'Niet ingesteld'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </View>

          {/* Level Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <View style={[styles.infoCardIcon, { backgroundColor: 'rgba(255,107,53,0.1)' }]}>
              <MaterialCommunityIcons name="arm-flex" size={24} color="#FF6B35" />
            </View>
            <View style={styles.infoCardContent}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Niveau
              </Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                {getLabel(LEVELS, user?.level || '') || 'Niet ingesteld'}
              </Text>
            </View>
          </View>

          {/* Training Style Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <View style={[styles.infoCardIcon, { backgroundColor: 'rgba(0,176,255,0.1)' }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#00B0FF" />
            </View>
            <View style={styles.infoCardContent}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Training Stijl
              </Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                {getLabel(TRAINING_STYLES, user?.trainingStyle || '') || 'Niet ingesteld'}
              </Text>
            </View>
          </View>

          {/* Goals */}
          <View style={[styles.goalsCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <View style={styles.goalsHeader}>
              <View style={[styles.infoCardIcon, { backgroundColor: 'rgba(255,184,0,0.1)' }]}>
                <MaterialCommunityIcons name="target" size={24} color="#FFB800" />
              </View>
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, fontWeight: '600', flex: 1 }}>
                Mijn Doelen
              </Text>
            </View>
            <View style={styles.goalsChips}>
              {user?.goals?.length ? (
                user.goals.map((goal, index) => (
                  <Chip 
                    key={goal} 
                    compact 
                    style={[styles.goalChip, { backgroundColor: getGoalChipColor(index) }]}
                    textStyle={{ color: 'white', fontWeight: '600' }}
                  >
                    {getLabel(GOALS, goal)}
                  </Chip>
                ))
              ) : (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Geen doelen ingesteld
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Premium Card */}
        {!user?.isPremium && (
          <View style={styles.section}>
            <LinearGradient
              colors={['#FF6B35', '#FF3D00']}
              style={styles.premiumCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.premiumCardContent}>
                <View style={styles.premiumIcon}>
                  <MaterialCommunityIcons name="crown" size={32} color="white" />
                </View>
                <View style={styles.premiumInfo}>
                  <Text variant="titleMedium" style={{ color: 'white', fontWeight: 'bold' }}>
                    Upgrade naar Premium
                  </Text>
                  <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Onbeperkt likes & exclusieve features
                  </Text>
                </View>
              </View>
              <Button 
                mode="contained" 
                buttonColor="white" 
                textColor="#FF6B35"
                onPress={() => setUpgradeVisible(true)}
                labelStyle={{ fontWeight: '700' }}
              >
                Bekijk
              </Button>
            </LinearGradient>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.section}>
          <View style={[styles.menuCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <MenuItem
              icon="shield-check"
              label="Privacy & Veiligheid"
              color="#00C853"
              onPress={() => router.push('/(tabs)/settings')}
              isDark={isDark}
            />
            <View style={[styles.menuDivider, { backgroundColor: isDark ? '#252536' : '#F0F0F0' }]} />
            <MenuItem
              icon="help-circle"
              label="Help & Support"
              color="#00B0FF"
              onPress={() => {}}
              isDark={isDark}
            />
            <View style={[styles.menuDivider, { backgroundColor: isDark ? '#252536' : '#F0F0F0' }]} />
            <MenuItem
              icon="logout"
              label="Uitloggen"
              color="#FF1744"
              onPress={handleLogout}
              isDark={isDark}
            />
          </View>
        </View>

        <Text variant="bodySmall" style={styles.version}>
          GymBuddy v1.0.0
        </Text>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Upgrade Modal */}
      <Portal>
        <Modal
          visible={upgradeVisible}
          onDismiss={() => setUpgradeVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF3D00']}
            style={styles.modalIcon}
          >
            <MaterialCommunityIcons name="crown" size={40} color="white" />
          </LinearGradient>
          <Text variant="headlineSmall" style={{ marginTop: 20, fontWeight: 'bold', color: theme.colors.onBackground }}>
            GymBuddy Premium
          </Text>
          <View style={styles.premiumFeatures}>
            <PremiumFeature icon="heart-multiple" text="Onbeperkt likes per dag" />
            <PremiumFeature icon="eye" text="Zie wie jou heeft geliked" />
            <PremiumFeature icon="filter" text="Geavanceerde filters" />
            <PremiumFeature icon="rocket" text="Boost je profiel" />
            <PremiumFeature icon="star" text="Prioriteit in de feed" />
          </View>
          <LinearGradient
            colors={['#FF6B35', '#FF3D00']}
            style={styles.premiumButton}
          >
            <Button mode="text" textColor="white" onPress={() => setUpgradeVisible(false)} labelStyle={{ fontWeight: '700' }}>
              €9,99/maand - Coming Soon
            </Button>
          </LinearGradient>
          <Button mode="text" onPress={() => setUpgradeVisible(false)} textColor={theme.colors.onSurfaceVariant}>
            Later
          </Button>
        </Modal>
      </Portal>

      {/* Edit Profile Modal */}
      <Portal>
        <Modal
          visible={editProfileVisible}
          onDismiss={() => setEditProfileVisible(false)}
          contentContainerStyle={[styles.editModal, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
        >
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 20, color: theme.colors.onBackground }}>
            Profiel bewerken
          </Text>

          <TextInput
            label="Naam"
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            style={{ marginBottom: 12 }}
          />

          <TextInput
            label="Bio (optioneel)"
            value={editBio}
            onChangeText={setEditBio}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Vertel iets over jezelf..."
            style={{ marginBottom: 20 }}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              mode="outlined"
              onPress={() => setEditProfileVisible(false)}
              style={{ flex: 1 }}
            >
              Annuleren
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={editLoading}
              disabled={editLoading || !editName.trim()}
              style={{ flex: 1 }}
            >
              Opslaan
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Badges Modal */}
      <Portal>
        <Modal
          visible={badgesModalVisible}
          onDismiss={() => setBadgesModalVisible(false)}
          contentContainerStyle={[styles.badgesModal, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
        >
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 8, color: theme.colors.onBackground }}>
            🏆 Alle Badges
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            {gamificationStats?.badges?.length || 0} van {BADGES.length} verdiend
          </Text>

          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {['streak', 'workout', 'social', 'special'].map(category => (
              <View key={category} style={{ marginBottom: 20 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onBackground, fontWeight: '600', marginBottom: 12, textTransform: 'capitalize' }}>
                  {category === 'streak' ? '🔥 Streaks' : 
                   category === 'workout' ? '💪 Workouts' :
                   category === 'social' ? '👥 Social' : '⭐ Speciaal'}
                </Text>
                <View style={styles.badgesGrid}>
                  {BADGES.filter(b => b.category === category).map(badge => {
                    const earned = gamificationStats?.badges?.includes(badge.id);
                    return (
                      <View 
                        key={badge.id} 
                        style={[
                          styles.badgeGridItem, 
                          { 
                            backgroundColor: isDark ? '#252536' : '#F5F5F5',
                            opacity: earned ? 1 : 0.5,
                          }
                        ]}
                      >
                        <View style={[styles.badgeGridIcon, { backgroundColor: earned ? badge.color + '20' : 'transparent' }]}>
                          <MaterialCommunityIcons 
                            name={badge.icon as any} 
                            size={28} 
                            color={earned ? badge.color : theme.colors.onSurfaceVariant} 
                          />
                        </View>
                        <Text variant="labelMedium" style={{ color: theme.colors.onBackground, fontWeight: '600', marginTop: 8 }}>
                          {badge.name}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 2 }}>
                          {badge.requirement}
                        </Text>
                        {earned && (
                          <View style={styles.earnedBadge}>
                            <MaterialCommunityIcons name="check-circle" size={16} color="#00C853" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <Button 
            mode="contained" 
            onPress={() => setBadgesModalVisible(false)}
            style={{ marginTop: 16 }}
          >
            Sluiten
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

function StatItem({ value, label, icon, color }: { value: number; label: string; icon: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      <Text variant="headlineSmall" style={[styles.statValue, { color }]}>
        {value}
      </Text>
      <Text variant="labelSmall" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function QuickActionCard({ icon, label, color, onPress, isDark }: { icon: string; label: string; color: string; onPress: () => void; isDark: boolean }) {
  return (
    <TouchableOpacity 
      style={[styles.quickActionCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <Text variant="labelMedium" style={{ marginTop: 8, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuItem({ icon, label, color, onPress, isDark }: { icon: string; label: string; color: string; onPress: () => void; isDark: boolean }) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text variant="bodyLarge" style={{ flex: 1, color: theme.colors.onBackground }}>
        {label}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

function PremiumFeature({ icon, text }: { icon: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.premiumFeatureRow}>
      <MaterialCommunityIcons name={icon as any} size={20} color="#FF6B35" />
      <Text variant="bodyMedium" style={{ marginLeft: 12, color: theme.colors.onBackground }}>
        {text}
      </Text>
    </View>
  );
}

function getGoalChipColor(index: number): string {
  const colors = ['#FF6B35', '#00C853', '#00B0FF', '#FFB800', '#7C4DFF'];
  return colors[index % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 60,
  },
  // Gamification styles
  streakCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakFlames: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  streakNumber: {
    fontWeight: 'bold',
    lineHeight: 36,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
  },
  checkInText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  levelSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelProgress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  longestStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgesScroll: {
    paddingRight: 20,
    gap: 12,
  },
  badgeItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    width: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeName: {
    textAlign: 'center',
    fontWeight: '600',
  },
  noBadgesCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    marginRight: 20,
  },
  badgesModal: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
    maxHeight: '80%',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeGridItem: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
  },
  badgeGridIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
  },
  profileSection: {
    marginTop: -50,
    paddingHorizontal: 20,
  },
  profileCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 12,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
  },
  premiumBadgeGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  bio: {
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  editProfileButton: {
    marginTop: 12,
    borderRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    opacity: 0.2,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    opacity: 0.6,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoCardContent: {
    flex: 1,
  },
  goalsCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    borderRadius: 20,
  },
  premiumCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  premiumInfo: {
    flex: 1,
  },
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuDivider: {
    height: 1,
    marginLeft: 66,
  },
  version: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.4,
  },
  modal: {
    margin: 24,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumFeatures: {
    alignSelf: 'stretch',
    marginTop: 24,
    gap: 12,
  },
  premiumFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumButton: {
    marginTop: 24,
    borderRadius: 16,
    width: '100%',
  },
  editModal: {
    margin: 24,
    padding: 24,
    borderRadius: 24,
  },
});
