import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, useColorScheme, ScrollView } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import debounce from '@/lib/debounce';

export interface GymResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface GymSearchProps {
  value: string;
  onSelect: (gym: GymResult) => void;
  placeholder?: string;
  currentLat?: number | null;
  currentLng?: number | null;
}

// Popular gym chains in Netherlands for quick results
const POPULAR_GYMS = [
  'Basic-Fit',
  'Fit For Free',
  'SportCity',
  'Anytime Fitness',
  'TrainMore',
  'HealthCity',
  'David Lloyd',
  'Virgin Active',
  'Fitness World',
  'Big Gym',
];

export function GymSearch({ value, onSelect, placeholder = "Zoek je sportschool...", currentLat, currentLng }: GymSearchProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GymResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    currentLat && currentLng ? { lat: currentLat, lng: currentLng } : null
  );

  // Get user location if not provided
  useEffect(() => {
    if (!userLocation) {
      getUserLocation();
    }
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Could not get location:', error);
      // Default to Amsterdam
      setUserLocation({ lat: 52.3676, lng: 4.9041 });
    }
  };

  // Search gyms using Nominatim (OpenStreetMap) with Overpass API fallback
  const searchGyms = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const allResults: GymResult[] = [];
      
      // Method 1: Direct search for the gym name
      const lat = userLocation?.lat || 52.3676;
      const lng = userLocation?.lng || 4.9041;
      
      // Search using Nominatim for the specific name
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=15&` +
        `countrycodes=nl,be,de`,
        {
          headers: {
            'User-Agent': 'GymBuddy App/1.0',
          },
        }
      );

      const nominatimData = await nominatimResponse.json();
      
      // Filter and map Nominatim results
      const nominatimGyms: GymResult[] = nominatimData
        .filter((item: any) => {
          // Filter for fitness-related places
          const name = (item.name || item.display_name || '').toLowerCase();
          const type = (item.type || '').toLowerCase();
          const category = (item.class || '').toLowerCase();
          
          return name.includes('fit') || 
                 name.includes('gym') || 
                 name.includes('sport') ||
                 name.includes('fitness') ||
                 type.includes('sports') ||
                 category.includes('leisure') ||
                 category.includes('amenity');
        })
        .map((item: any, index: number) => {
          const itemLat = parseFloat(item.lat);
          const itemLng = parseFloat(item.lon);
          let distance: number | undefined;
          
          if (userLocation) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, itemLat, itemLng);
          }

          return {
            id: item.place_id?.toString() || `nom-${index}`,
            name: item.name || item.display_name.split(',')[0],
            address: formatAddress(item.address || {}, item.display_name),
            lat: itemLat,
            lng: itemLng,
            distance,
          };
        });

      allResults.push(...nominatimGyms);

      // Method 2: Use Overpass API to find nearby gyms/fitness centers
      if (userLocation && allResults.length < 5) {
        try {
          const overpassQuery = `
            [out:json][timeout:10];
            (
              node["leisure"="fitness_centre"](around:25000,${lat},${lng});
              node["amenity"="gym"](around:25000,${lat},${lng});
              way["leisure"="fitness_centre"](around:25000,${lat},${lng});
              way["amenity"="gym"](around:25000,${lat},${lng});
            );
            out center;
          `;
          
          const overpassResponse = await fetch(
            'https://overpass-api.de/api/interpreter',
            {
              method: 'POST',
              body: overpassQuery,
            }
          );
          
          const overpassData = await overpassResponse.json();
          
          const overpassGyms: GymResult[] = (overpassData.elements || [])
            .filter((el: any) => {
              const name = (el.tags?.name || '').toLowerCase();
              return name.includes(searchQuery.toLowerCase());
            })
            .map((el: any, index: number) => {
              const elLat = el.lat || el.center?.lat;
              const elLng = el.lon || el.center?.lon;
              let distance: number | undefined;
              
              if (userLocation && elLat && elLng) {
                distance = calculateDistance(userLocation.lat, userLocation.lng, elLat, elLng);
              }

              return {
                id: `ovp-${el.id || index}`,
                name: el.tags?.name || 'Onbekende gym',
                address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(' ') || 'Adres onbekend',
                lat: elLat,
                lng: elLng,
                distance,
              };
            })
            .filter((gym: GymResult) => gym.lat && gym.lng);

          allResults.push(...overpassGyms);
        } catch (overpassError) {
          console.log('Overpass API error:', overpassError);
        }
      }

      // Remove duplicates by name
      const uniqueResults = allResults.filter((gym, index, self) =>
        index === self.findIndex((g) => g.name.toLowerCase() === gym.name.toLowerCase())
      );

      // Sort by distance
      if (userLocation) {
        uniqueResults.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      }

      // If we have API results, use them
      if (uniqueResults.length > 0) {
        setResults(uniqueResults.slice(0, 10));
      } else {
        // Fallback: show matching popular gyms with option to add location manually
        const popularMatches = POPULAR_GYMS
          .filter(gym => gym.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((gym, index) => ({
            id: `popular-${index}`,
            name: gym,
            address: `Gebruik huidige locatie (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
            lat: lat,
            lng: lng,
            distance: 0,
          }));

        if (popularMatches.length > 0) {
          setResults(popularMatches);
        } else {
          // Allow custom gym name
          setResults([{
            id: 'custom-0',
            name: searchQuery,
            address: `Nieuwe sportschool toevoegen`,
            lat: lat,
            lng: lng,
            distance: 0,
          }]);
        }
      }
    } catch (error) {
      console.error('Gym search error:', error);
      // Fallback to custom entry
      const lat = userLocation?.lat || 52.3676;
      const lng = userLocation?.lng || 4.9041;
      
      setResults([{
        id: 'custom-0',
        name: searchQuery,
        address: `Sportschool toevoegen op huidige locatie`,
        lat: lat,
        lng: lng,
        distance: 0,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((q: string) => searchGyms(q), 500),
    [userLocation]
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setShowResults(true);
    debouncedSearch(text);
  };

  const handleSelect = (gym: GymResult) => {
    setQuery(gym.name);
    setShowResults(false);
    onSelect(gym);
  };

  const handleFocus = () => {
    setShowResults(true);
    if (query.length >= 2) {
      searchGyms(query);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          mode="flat"
          left={<TextInput.Icon icon="magnify" color={theme.colors.primary} />}
          right={loading ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : undefined}
          style={styles.input}
          underlineColor="transparent"
          activeUnderlineColor={theme.colors.primary}
        />
      </View>

      {showResults && results.length > 0 && (
        <View style={[styles.resultsContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
          <ScrollView 
            style={styles.resultsList} 
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {results.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.resultIcon, { backgroundColor: item.id.startsWith('custom') ? 'rgba(0,200,83,0.15)' : theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons 
                      name={item.id.startsWith('custom') ? "plus" : "dumbbell"} 
                      size={18} 
                      color={item.id.startsWith('custom') ? "#00C853" : theme.colors.primary} 
                    />
                  </View>
                  <View style={styles.resultText}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialCommunityIcons name="map-marker" size={12} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                  </View>
                  {item.distance !== undefined && item.distance > 0 && (
                    <View style={styles.distanceBadge}>
                      <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        {item.distance.toFixed(1)} km
                      </Text>
                    </View>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                {index < results.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: theme.colors.outline }]} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !loading && (
        <View style={[styles.noResults, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
          <MaterialCommunityIcons name="magnify-close" size={24} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Geen resultaten gevonden
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Typ de naam van je sportschool
          </Text>
        </View>
      )}
    </View>
  );
}

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatAddress(address: any, displayName: string): string {
  if (address) {
    const parts = [
      address.road || address.street,
      address.house_number,
      address.city || address.town || address.village,
    ].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }
  // Fallback to display name parts
  const parts = displayName.split(',').slice(1, 3).map(s => s.trim());
  return parts.join(', ') || displayName;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: 'transparent',
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 300,
    overflow: 'hidden',
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  distanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderRadius: 12,
  },
  separator: {
    height: 1,
    marginLeft: 66,
  },
  noResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
