import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// Use Inter font on all platforms
const fontConfig = {
  displayLarge: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  displayMedium: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  displaySmall: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  headlineLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  headlineMedium: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  headlineSmall: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  titleLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  titleSmall: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  bodyLarge: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  bodySmall: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  labelLarge: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  labelMedium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  labelSmall: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
};

// Fitness-inspired color palette
export const fitnessColors = {
  // Primary gradient colors
  gradientStart: '#FF6B35',
  gradientEnd: '#FF3D00',
  gradientGold: '#FFB800',
  
  // Accent colors
  energy: '#FF6B35',      // Orange - Energy/Power
  success: '#00C853',     // Green - Success/Complete
  intensity: '#FF1744',   // Red - High intensity
  calm: '#00B0FF',        // Blue - Recovery/Rest
  premium: '#FFD700',     // Gold - Premium
  
  // Workout types
  cardio: '#FF5252',
  strength: '#FF6B35',
  flexibility: '#7C4DFF',
  hiit: '#FF9100',
  
  // Levels
  beginner: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#F44336',
  
  // UI helpers
  cardShadow: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(0,0,0,0.6)',
  glassBg: 'rgba(255,255,255,0.1)',
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35',
    primaryContainer: '#FFF0EB',
    secondary: '#1A1A2E',
    secondaryContainer: '#E8E8EE',
    tertiary: '#00C853',
    tertiaryContainer: '#E0F7EA',
    error: '#FF1744',
    errorContainer: '#FFE5E9',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onBackground: '#1A1A2E',
    onSurface: '#1A1A2E',
    onSurfaceVariant: '#5C5C6F',
    outline: '#E0E0E0',
    outlineVariant: '#EEEEEE',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FAFAFA',
      level3: '#F5F5F5',
      level4: '#EEEEEE',
      level5: '#E0E0E0',
    },
  },
  custom: fitnessColors,
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FF8A65',
    primaryContainer: '#4A1E00',
    secondary: '#B0BEC5',
    secondaryContainer: '#37474F',
    tertiary: '#69F0AE',
    tertiaryContainer: '#004D40',
    error: '#FF5252',
    errorContainer: '#4A0000',
    background: '#0D0D14',
    surface: '#1A1A2E',
    surfaceVariant: '#252536',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onTertiary: '#000000',
    onBackground: '#FAFAFA',
    onSurface: '#FAFAFA',
    onSurfaceVariant: '#B0B0C0',
    outline: '#3A3A4A',
    outlineVariant: '#252536',
    elevation: {
      level0: 'transparent',
      level1: '#1A1A2E',
      level2: '#252536',
      level3: '#2F2F42',
      level4: '#3A3A4E',
      level5: '#45455A',
    },
  },
  custom: fitnessColors,
};

export type AppTheme = typeof lightTheme;
