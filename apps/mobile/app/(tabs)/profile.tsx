import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, useTheme, Card, Avatar, Button, Chip, ProgressBar, List, Divider, Portal, Modal, Switch, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { getLabel, GOALS, LEVELS, TRAINING_STYLES, WEEKDAYS, TIME_SLOTS } from '@/lib/constants';
import { AvatarPicker } from '@/components/avatar-picker';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);

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

  const getAvailabilityText = () => {
    if (!user?.availability || user.availability.length === 0) {
      return 'Niet ingesteld';
    }
    return user.availability
      .map((a) => `${getLabel(WEEKDAYS, a.day)}: ${a.timeSlots.map(s => TIME_SLOTS.find(t => t.value === s)?.label.split(' ')[0] || s).join(', ')}`)
      .join('\n');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <Card style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.profileContent}>
            <AvatarPicker
              currentAvatar={user?.avatarUrl || null}
              onAvatarChange={(newUrl) => refreshUser()}
              size={80}
            />
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={styles.name}>
                {user?.name}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {user?.email}
              </Text>
              {user?.isPremium && (
                <Chip icon="star" compact style={styles.premiumChip}>
                  Premium
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Verification Score */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.verificationHeader}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={24}
                color={user?.verificationScore && user.verificationScore >= 80 ? theme.colors.primary : theme.colors.outline}
              />
              <Text variant="titleMedium">Profiel compleetheid</Text>
            </View>
            <ProgressBar
              progress={(user?.verificationScore || 0) / 100}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {user?.verificationScore || 0}% compleet
            </Text>
          </Card.Content>
        </Card>

        {/* Gym Info */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Mijn Gym
            </Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge">{user?.gymName || 'Niet ingesteld'}</Text>
            </View>
            {user?.gymAddress && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {user.gymAddress}
                </Text>
              </View>
            )}
            <Button
              mode="outlined"
              onPress={() => router.push('/(onboarding)/step2')}
              style={styles.editButton}
              compact
            >
              Bewerken
            </Button>
          </Card.Content>
        </Card>

        {/* Goals & Level */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Doelen & Niveau
            </Text>
            <View style={styles.chipRow}>
              {user?.goals?.map((goal) => (
                <Chip key={goal} compact>
                  {getLabel(GOALS, goal)}
                </Chip>
              ))}
              {(!user?.goals || user.goals.length === 0) && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Geen doelen ingesteld
                </Text>
              )}
            </View>
            <View style={[styles.infoRow, { marginTop: 12 }]}>
              <MaterialCommunityIcons name="chart-line" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge">{getLabel(LEVELS, user?.level || '') || 'Niet ingesteld'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="weight-lifter" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge">
                {getLabel(TRAINING_STYLES, user?.trainingStyle || '') || 'Niet ingesteld'}
              </Text>
            </View>
            <Button
              mode="outlined"
              onPress={() => router.push('/(onboarding)/step1')}
              style={styles.editButton}
              compact
            >
              Bewerken
            </Button>
          </Card.Content>
        </Card>

        {/* Availability */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Beschikbaarheid
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {getAvailabilityText()}
            </Text>
            <Button
              mode="outlined"
              onPress={() => router.push('/(onboarding)/step3')}
              style={styles.editButton}
              compact
            >
              Bewerken
            </Button>
          </Card.Content>
        </Card>

        {/* Premium Upgrade */}
        {!user?.isPremium && (
          <Card
            style={[styles.upgradeCard, { backgroundColor: theme.colors.primaryContainer }]}
            onPress={() => setUpgradeVisible(true)}
          >
            <Card.Content style={styles.upgradeContent}>
              <MaterialCommunityIcons name="star" size={40} color={theme.colors.primary} />
              <View style={styles.upgradeInfo}>
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                  Upgrade naar Premium
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  Onbeperkt likes, geavanceerde filters en meer!
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </Card.Content>
          </Card>
        )}

        {/* Settings */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title="Instellingen"
            left={(props) => <List.Icon {...props} icon="cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setSettingsVisible(true)}
          />
          <Divider />
          <List.Item
            title="Privacy & Veiligheid"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Help & Support"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </Card>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={theme.colors.error}
        >
          Uitloggen
        </Button>

        <Text variant="bodySmall" style={styles.version}>
          GymBuddy v1.0.0
        </Text>
      </ScrollView>

      {/* Settings Modal */}
      <Portal>
        <Modal
          visible={settingsVisible}
          onDismiss={() => setSettingsVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="headlineSmall" style={{ marginBottom: 16 }}>
            Instellingen
          </Text>
          <List.Item
            title="Push notificaties"
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
          <List.Item
            title="Locatie delen"
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
          <List.Item
            title="Profiel zichtbaar"
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
          <Button mode="text" onPress={() => setSettingsVisible(false)} style={{ marginTop: 16 }}>
            Sluiten
          </Button>
        </Modal>
      </Portal>

      {/* Upgrade Modal */}
      <Portal>
        <Modal
          visible={upgradeVisible}
          onDismiss={() => setUpgradeVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <MaterialCommunityIcons name="star" size={60} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={{ marginTop: 16 }}>
            GymBuddy Premium
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: 16 }}>
            Upgrade voor de beste ervaring:
          </Text>
          <View style={styles.premiumFeatures}>
            <Text variant="bodyMedium">✓ Onbeperkt likes per dag</Text>
            <Text variant="bodyMedium">✓ Zie wie jou heeft geliked</Text>
            <Text variant="bodyMedium">✓ Geavanceerde filters</Text>
            <Text variant="bodyMedium">✓ Boost je profiel</Text>
            <Text variant="bodyMedium">✓ Prioriteit in de feed</Text>
          </View>
          <Button mode="contained" style={{ marginTop: 24 }} onPress={() => setUpgradeVisible(false)}>
            €9,99/maand - Coming Soon
          </Button>
          <Button mode="text" onPress={() => setUpgradeVisible(false)}>
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
  content: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  premiumChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  upgradeCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeInfo: {
    flex: 1,
  },
  logoutButton: {
    marginTop: 8,
    borderColor: 'transparent',
  },
  version: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
    opacity: 0.5,
  },
  modal: {
    margin: 24,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  premiumFeatures: {
    alignItems: 'flex-start',
    gap: 8,
  },
});
