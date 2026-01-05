import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api, RouletteResult } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WORKOUT_COLORS: Record<string, { gradient: [string, string]; icon: string }> = {
  push: { gradient: ['#FF6B35', '#FF3D00'], icon: 'arm-flex' },
  pull: { gradient: ['#4ECDC4', '#26A69A'], icon: 'weight-lifter' },
  legs: { gradient: ['#9B59B6', '#7E57C2'], icon: 'run-fast' },
  cardio: { gradient: ['#E74C3C', '#C62828'], icon: 'heart-pulse' },
  core: { gradient: ['#F39C12', '#FF8F00'], icon: 'human' },
  full_body: { gradient: ['#1ABC9C', '#00897B'], icon: 'dumbbell' },
};

export default function WorkoutRouletteScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const spinWheel = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setShowResult(false);
    setResult(null);
    resultOpacity.setValue(0);
    
    // Start spinning animation
    spinValue.setValue(0);
    
    // Pulse the button
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Spin animation
    const spinAnimation = Animated.timing(spinValue, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    
    spinAnimation.start();
    
    try {
      // Fetch result from API
      const response = await api.spinRoulette();
      
      // Wait for animation to finish
      setTimeout(() => {
        setResult(response.data);
        setShowResult(true);
        setIsSpinning(false);
        
        // Fade in result
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 3000);
    } catch (error) {
      console.error('Spin error:', error);
      setIsSpinning(false);
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1440deg'], // 4 full rotations
  });

  const colors = result ? WORKOUT_COLORS[result.category] : { gradient: ['#FF6B35', '#FF3D00'], icon: 'dumbbell' };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>Workout Roulette</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wheel Section */}
        <View style={styles.wheelSection}>
          <Text style={[styles.subtitle, isDark && styles.textMuted]}>
            Weet je niet wat je moet trainen? 🎰
          </Text>
          
          <Animated.View style={[styles.wheelContainer, { transform: [{ rotate: spin }] }]}>
            <LinearGradient
              colors={colors.gradient}
              style={styles.wheel}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons 
                name={isSpinning ? 'loading' : (result?.icon || 'dumbbell') as any} 
                size={80} 
                color="white" 
              />
            </LinearGradient>
          </Animated.View>

          {/* Spin Button */}
          <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
            <TouchableOpacity
              onPress={spinWheel}
              disabled={isSpinning}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isSpinning ? ['#666', '#444'] : ['#FF6B35', '#FF3D00']}
                style={styles.spinButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSpinning ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="dice-multiple" size={24} color="white" />
                    <Text style={styles.spinButtonText}>SPIN!</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Result Section */}
        {showResult && result && (
          <Animated.View style={[styles.resultSection, { opacity: resultOpacity }]}>
            <LinearGradient
              colors={colors.gradient}
              style={styles.resultHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name={result.icon as any} size={32} color="white" />
              <Text style={styles.resultTitle}>{result.name}</Text>
            </LinearGradient>

            <View style={[styles.resultBody, isDark && styles.cardDark]}>
              <View style={styles.resultStats}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#FF6B35" />
                  <Text style={[styles.statText, isDark && styles.textLight]}>
                    ~{result.estimatedMinutes} min
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                  <Text style={[styles.statText, isDark && styles.textLight]}>
                    +{result.xpReward} XP
                  </Text>
                </View>
              </View>

              <Text style={[styles.exercisesTitle, isDark && styles.textLight]}>
                Oefeningen:
              </Text>

              {result.exercises.map((exercise, index) => (
                <View key={index} style={[styles.exerciseItem, isDark && styles.exerciseItemDark]}>
                  <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, isDark && styles.textLight]}>
                      {exercise.name}
                    </Text>
                    <Text style={[styles.exerciseMeta, isDark && styles.textMuted]}>
                      {exercise.sets} • {exercise.muscle}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Start Workout Button */}
              <TouchableOpacity 
                style={styles.startButton}
                onPress={() => {
                  // Navigate to start training with this workout
                  router.push({
                    pathname: '/start-training',
                    params: { workoutType: result.category, workoutName: result.name }
                  });
                }}
              >
                <LinearGradient
                  colors={colors.gradient}
                  style={styles.startButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="play" size={24} color="white" />
                  <Text style={styles.startButtonText}>Start Training</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Tips */}
        {!showResult && (
          <View style={[styles.tipsSection, isDark && styles.cardDark]}>
            <Text style={[styles.tipsTitle, isDark && styles.textLight]}>
              💡 Tips
            </Text>
            <Text style={[styles.tipText, isDark && styles.textMuted]}>
              • Draai het wiel voor een random workout
            </Text>
            <Text style={[styles.tipText, isDark && styles.textMuted]}>
              • Verdien XP door de workout te voltooien
            </Text>
            <Text style={[styles.tipText, isDark && styles.textMuted]}>
              • Train met een buddy voor extra punten!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  wheelSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  wheelContainer: {
    marginBottom: 30,
  },
  wheel: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  spinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resultSection: {
    marginTop: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  resultTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  resultBody: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exercisesTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  exerciseItemDark: {
    backgroundColor: '#2a2a2a',
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 13,
    color: '#888',
  },
  startButton: {
    marginTop: 20,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  tipsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
});

