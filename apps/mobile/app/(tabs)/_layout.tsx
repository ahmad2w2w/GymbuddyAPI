import { View, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabsLayout() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Register for push notifications when user is logged in
  usePushNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? 'rgba(26,26,46,0.95)' : 'rgba(255,255,255,0.98)',
          borderTopWidth: 0,
          height: 85,
          paddingBottom: 25,
          paddingTop: 12,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Ontdek',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <MaterialCommunityIcons 
                name={focused ? "fire" : "fire"} 
                size={24} 
                color={focused ? theme.colors.primary : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Sessies',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <MaterialCommunityIcons 
                name={focused ? "calendar-star" : "calendar-clock"} 
                size={24} 
                color={focused ? theme.colors.primary : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerButtonContainer}>
              <LinearGradient
                colors={['#FF6B35', '#FF3D00']}
                style={styles.centerButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons 
                  name="plus" 
                  size={28} 
                  color="white" 
                />
              </LinearGradient>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <MaterialCommunityIcons 
                name={focused ? "chat" : "chat-outline"} 
                size={24} 
                color={focused ? theme.colors.primary : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profiel',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <MaterialCommunityIcons 
                name={focused ? "account-circle" : "account-circle-outline"} 
                size={24} 
                color={focused ? theme.colors.primary : color} 
              />
            </View>
          ),
        }}
      />
      {/* Settings is now hidden from tab bar, accessible via Profile */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderRadius: 12,
    padding: 6,
    marginBottom: -6,
  },
  centerButtonContainer: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
