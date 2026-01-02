import { View, StyleSheet, ImageBackground } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="dumbbell" size={100} color="white" />
          <Text variant="displayMedium" style={styles.title}>
            GymBuddy
          </Text>
          <Text variant="titleMedium" style={styles.subtitle}>
            Vind je perfecte trainingsmaatje
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            icon="account-group"
            title="Match met gymmaatjes"
            description="Vind mensen met dezelfde doelen en niveau"
          />
          <FeatureItem
            icon="map-marker"
            title="Sessies in de buurt"
            description="Ontdek trainingen bij jouw gym"
          />
          <FeatureItem
            icon="calendar-check"
            title="Plan samen"
            description="Maak afspraken en train samen"
          />
        </View>

        <View style={styles.buttons}>
          <Button
            mode="contained"
            onPress={() => router.push('/(auth)/register')}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="white"
            textColor={theme.colors.primary}
          >
            Account aanmaken
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/(auth)/login')}
            style={styles.button}
            contentStyle={styles.buttonContent}
            textColor="white"
            theme={{ colors: { outline: 'white' } }}
          >
            Inloggen
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <MaterialCommunityIcons
        name={icon as any}
        size={32}
        color="rgba(255,255,255,0.9)"
      />
      <View style={styles.featureText}>
        <Text variant="titleSmall" style={styles.featureTitle}>
          {title}
        </Text>
        <Text variant="bodySmall" style={styles.featureDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  features: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: 'white',
    fontWeight: '600',
  },
  featureDescription: {
    color: 'rgba(255,255,255,0.7)',
  },
  buttons: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
