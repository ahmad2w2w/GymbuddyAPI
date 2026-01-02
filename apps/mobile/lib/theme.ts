import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontWeight: '700' as const },
  displayMedium: { fontFamily: 'System', fontWeight: '700' as const },
  displaySmall: { fontFamily: 'System', fontWeight: '700' as const },
  headlineLarge: { fontFamily: 'System', fontWeight: '600' as const },
  headlineMedium: { fontFamily: 'System', fontWeight: '600' as const },
  headlineSmall: { fontFamily: 'System', fontWeight: '600' as const },
  titleLarge: { fontFamily: 'System', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'System', fontWeight: '500' as const },
  titleSmall: { fontFamily: 'System', fontWeight: '500' as const },
  bodyLarge: { fontFamily: 'System', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'System', fontWeight: '400' as const },
  bodySmall: { fontFamily: 'System', fontWeight: '400' as const },
  labelLarge: { fontFamily: 'System', fontWeight: '500' as const },
  labelMedium: { fontFamily: 'System', fontWeight: '500' as const },
  labelSmall: { fontFamily: 'System', fontWeight: '500' as const },
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35',
    primaryContainer: '#FFE4DB',
    secondary: '#2D3748',
    secondaryContainer: '#E2E8F0',
    tertiary: '#38A169',
    tertiaryContainer: '#C6F6D5',
    error: '#E53E3E',
    errorContainer: '#FED7D7',
    background: '#F7FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F4F8',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onBackground: '#1A202C',
    onSurface: '#1A202C',
    onSurfaceVariant: '#4A5568',
    outline: '#CBD5E0',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F7FAFC',
      level3: '#EDF2F7',
      level4: '#E2E8F0',
      level5: '#CBD5E0',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FF8C5A',
    primaryContainer: '#7A2E00',
    secondary: '#A0AEC0',
    secondaryContainer: '#2D3748',
    tertiary: '#68D391',
    tertiaryContainer: '#22543D',
    error: '#FC8181',
    errorContainer: '#742A2A',
    background: '#1A202C',
    surface: '#2D3748',
    surfaceVariant: '#4A5568',
    onPrimary: '#1A202C',
    onSecondary: '#1A202C',
    onTertiary: '#1A202C',
    onBackground: '#F7FAFC',
    onSurface: '#F7FAFC',
    onSurfaceVariant: '#CBD5E0',
    outline: '#4A5568',
    elevation: {
      level0: 'transparent',
      level1: '#2D3748',
      level2: '#4A5568',
      level3: '#718096',
      level4: '#A0AEC0',
      level5: '#CBD5E0',
    },
  },
};

export type AppTheme = typeof lightTheme;



