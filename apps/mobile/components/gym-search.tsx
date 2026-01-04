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

// Popular gym chains in Netherlands for detection
const GYM_CHAINS = [
  'basic-fit', 'basicfit', 'basic fit',
  'fit for free', 'fitforfree',
  'sportcity', 'sport city',
  'anytime fitness', 'anytimefitness',
  'trainmore', 'train more',
  'healthcity', 'health city',
  'david lloyd',
  'virgin active',
  'fitness world', 'fitnessworld',
  'big gym', 'biggym',
  'fit20', 'fit 20',
  'sportschool',
  'gym',
  'fitness',
];

// Dutch cities for detection
const DUTCH_CITIES = [
  'amsterdam', 'rotterdam', 'den haag', 'the hague', 's-gravenhage',
  'utrecht', 'eindhoven', 'tilburg', 'groningen', 'almere',
  'breda', 'nijmegen', 'enschede', 'haarlem', 'arnhem',
  'zaanstad', 'amersfoort', 'apeldoorn', 'hoofddorp', 'maastricht',
  'leiden', 'dordrecht', 'zoetermeer', 'zwolle', 'deventer',
  'delft', 'alkmaar', 'heerlen', 'venlo', 'leeuwarden',
  'hilversum', 'amstelveen', 'roosendaal', 'oss', 'schiedam',
  'spijkenisse', 'helmond', 'vlaardingen', 'almelo', 'gouda',
  'zaandam', 'lelystad', 'alphen', 'hoorn', 'velsen',
  'purmerend', 'assen', 'capelle', 'nieuwegein', 'veenendaal',
  'zeist', 'harderwijk', 'doetinchem', 'barneveld', 'hoogeveen',
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
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'denied') {
        setUserLocation({ lat: 52.3676, lng: 4.9041 });
        return;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } else {
        setUserLocation({ lat: 52.3676, lng: 4.9041 });
      }
    } catch (error) {
      console.log('Could not get location:', error);
      setUserLocation({ lat: 52.3676, lng: 4.9041 });
    }
  };

  // Parse query to detect gym chain and city
  const parseQuery = (searchQuery: string): { gymName: string | null; cityName: string | null } => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    
    // Find matching gym chain
    let gymName: string | null = null;
    for (const chain of GYM_CHAINS) {
      if (lowerQuery.includes(chain)) {
        gymName = chain;
        break;
      }
    }
    
    // Find matching city
    let cityName: string | null = null;
    for (const city of DUTCH_CITIES) {
      if (lowerQuery.includes(city)) {
        cityName = city;
        break;
      }
    }
    
    return { gymName, cityName };
  };

  // Geocode a city name to coordinates
  const geocodeCity = async (cityName: string): Promise<{ lat: number; lng: number; bbox?: number[] } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(cityName)}&` +
        `format=json&` +
        `limit=1&` +
        `countrycodes=nl`,
        { headers: { 'User-Agent': 'GymBuddy App/1.0' } }
      );
      const data = await response.json();
      
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          bbox: data[0].boundingbox?.map(parseFloat),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocode error:', error);
      return null;
    }
  };

  // Search gyms in area using Nominatim (more reliable than Overpass)
  const searchGymsInArea = async (
    centerLat: number, 
    centerLng: number, 
    radiusKm: number,
    gymNameFilter?: string
  ): Promise<GymResult[]> => {
    try {
      // Use Nominatim with viewbox for area search - more reliable
      const delta = radiusKm / 111; // Rough conversion km to degrees
      const viewbox = `${centerLng - delta},${centerLat + delta},${centerLng + delta},${centerLat - delta}`;
      
      // Search query - combine gym name with "fitness" or "gym"
      const searchTerm = gymNameFilter 
        ? `${gymNameFilter} fitness` 
        : 'fitness gym sportschool';
      
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchTerm)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=20&` +
        `viewbox=${viewbox}&` +
        `bounded=1&` +
        `countrycodes=nl,be,de`;
      
      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'GymBuddy App/1.0' }
      });
      
      if (!response.ok) {
        console.log('Nominatim response not ok:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      let gyms: GymResult[] = data
        .filter((item: any) => {
          const name = (item.name || item.display_name || '').toLowerCase();
          // Must be fitness related
          return name.includes('fit') || 
                 name.includes('gym') || 
                 name.includes('sport') ||
                 name.includes('fitness');
        })
        .map((item: any, index: number) => {
          const itemLat = parseFloat(item.lat);
          const itemLng = parseFloat(item.lon);
          
          let distance: number | undefined;
          if (userLocation) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, itemLat, itemLng);
          }

          return {
            id: `nom-${item.place_id || index}`,
            name: item.name || item.display_name.split(',')[0],
            address: formatAddress(item.address || {}, item.display_name),
            lat: itemLat,
            lng: itemLng,
            distance,
          };
        });

      // Filter by gym name if provided
      if (gymNameFilter) {
        const filterLower = gymNameFilter.toLowerCase().replace(/[-\s]/g, '');
        gyms = gyms.filter(gym => {
          const nameLower = gym.name.toLowerCase().replace(/[-\s]/g, '');
          return nameLower.includes(filterLower) || filterLower.includes(nameLower.split(' ')[0]);
        });
      }

      return gyms;
    } catch (error) {
      console.error('Area search error:', error);
      return [];
    }
  };

  // Fallback: Search using Overpass API (may be rate limited)
  const searchGymsOverpass = async (
    centerLat: number, 
    centerLng: number, 
    radiusKm: number,
    gymNameFilter?: string
  ): Promise<GymResult[]> => {
    try {
      const radiusMeters = Math.min(radiusKm * 1000, 15000); // Max 15km to reduce load
      
      const overpassQuery = `[out:json][timeout:10];
(node["leisure"="fitness_centre"](around:${radiusMeters},${centerLat},${centerLng});
node["amenity"="gym"](around:${radiusMeters},${centerLat},${centerLng}););
out tags;`;
      
      const response = await fetch(
        'https://overpass-api.de/api/interpreter',
        { 
          method: 'POST', 
          body: `data=${encodeURIComponent(overpassQuery)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.log('Overpass returned non-JSON response');
        return [];
      }
      
      const data = await response.json();
      
      if (!data.elements) {
        return [];
      }
      
      let gyms: GymResult[] = data.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any, index: number) => {
          const elLat = el.lat || el.center?.lat;
          const elLng = el.lon || el.center?.lon;
          
          let distance: number | undefined;
          if (userLocation && elLat && elLng) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, elLat, elLng);
          }

          const addressParts = [
            el.tags?.['addr:street'],
            el.tags?.['addr:housenumber'],
            el.tags?.['addr:city'],
          ].filter(Boolean);

          return {
            id: `ovp-${el.id || index}`,
            name: el.tags?.name || 'Onbekende gym',
            address: addressParts.length > 0 ? addressParts.join(' ') : el.tags?.['addr:city'] || 'Adres onbekend',
            lat: elLat,
            lng: elLng,
            distance,
          };
        })
        .filter((gym: GymResult) => gym.lat && gym.lng);

      // Filter by gym name if provided
      if (gymNameFilter) {
        const filterLower = gymNameFilter.toLowerCase().replace(/[-\s]/g, '');
        gyms = gyms.filter(gym => {
          const nameLower = gym.name.toLowerCase().replace(/[-\s]/g, '');
          return nameLower.includes(filterLower) || filterLower.includes(nameLower.split(' ')[0]);
        });
      }

      return gyms;
    } catch (error) {
      console.log('Overpass fallback error (ignoring):', error);
      return [];
    }
  };

  // Main search function
  const searchGyms = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { gymName, cityName } = parseQuery(searchQuery);
      let allResults: GymResult[] = [];
      const lat = userLocation?.lat || 52.3676;
      const lng = userLocation?.lng || 4.9041;

      // Case 1: Gym chain + City (e.g., "Basic-Fit Rotterdam")
      if (gymName && cityName) {
        console.log(`Searching for ${gymName} in ${cityName}`);
        
        // Direct Nominatim search for gym chain in city
        const searchTerm = `${gymName} ${cityName}`;
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(searchTerm)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=20&` +
          `countrycodes=nl,be,de`,
          { headers: { 'User-Agent': 'GymBuddy App/1.0' } }
        );

        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          const gyms = nominatimData
            .filter((item: any) => item.name)
            .map((item: any, index: number) => ({
              id: item.place_id?.toString() || `nom-${index}`,
              name: item.name || item.display_name.split(',')[0],
              address: formatAddress(item.address || {}, item.display_name),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, parseFloat(item.lat), parseFloat(item.lon)) : undefined,
            }));
          allResults.push(...gyms);
        }

        // If not enough results, try area search
        if (allResults.length < 3) {
          const cityCoords = await geocodeCity(cityName);
          if (cityCoords) {
            const areaResults = await searchGymsInArea(cityCoords.lat, cityCoords.lng, 20, gymName);
            allResults.push(...areaResults);
          }
        }

        // Try Overpass as last resort
        if (allResults.length < 3) {
          const cityCoords = await geocodeCity(cityName);
          if (cityCoords) {
            const overpassResults = await searchGymsOverpass(cityCoords.lat, cityCoords.lng, 15, gymName);
            allResults.push(...overpassResults);
          }
        }
      }
      
      // Case 2: Only city name (e.g., "Rotterdam") - show all gyms in that city
      else if (cityName && !gymName) {
        console.log(`Searching all gyms in ${cityName}`);
        
        const cityCoords = await geocodeCity(cityName);
        if (cityCoords) {
          allResults = await searchGymsInArea(cityCoords.lat, cityCoords.lng, 15);
          
          // Add Overpass results if needed
          if (allResults.length < 5) {
            const overpassResults = await searchGymsOverpass(cityCoords.lat, cityCoords.lng, 10);
            allResults.push(...overpassResults);
          }
        }
      }
      
      // Case 3: Only gym chain or general search - search near user
      else {
        // Search Nominatim for gyms with the query
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(searchQuery + ' fitness')}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=15&` +
          `countrycodes=nl,be,de`,
          { headers: { 'User-Agent': 'GymBuddy App/1.0' } }
        );

        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          
          const nominatimGyms: GymResult[] = nominatimData
            .filter((item: any) => {
              const name = (item.name || item.display_name || '').toLowerCase();
              return name.includes('fit') || 
                     name.includes('gym') || 
                     name.includes('sport') ||
                     name.includes('fitness');
            })
            .map((item: any, index: number) => ({
              id: item.place_id?.toString() || `nom-${index}`,
              name: item.name || item.display_name.split(',')[0],
              address: formatAddress(item.address || {}, item.display_name),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, parseFloat(item.lat), parseFloat(item.lon)) : undefined,
            }));

          allResults.push(...nominatimGyms);
        }

        // Also search nearby with Overpass if few results
        if (allResults.length < 5) {
          const overpassResults = await searchGymsOverpass(lat, lng, 15, gymName || undefined);
          allResults.push(...overpassResults);
        }
      }

      // Remove duplicates by name + location
      const uniqueResults = allResults.filter((gym, index, self) =>
        index === self.findIndex((g) => 
          g.name.toLowerCase() === gym.name.toLowerCase() &&
          Math.abs(g.lat - gym.lat) < 0.002
        )
      );

      // Sort by distance from user
      if (userLocation) {
        uniqueResults.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      }

      if (uniqueResults.length > 0) {
        setResults(uniqueResults.slice(0, 15));
      } else {
        // Fallback: allow custom gym name
        setResults([{
          id: 'custom-0',
          name: searchQuery,
          address: `Sportschool toevoegen`,
          lat: lat,
          lng: lng,
          distance: 0,
        }]);
      }
    } catch (error) {
      console.error('Gym search error:', error);
      const lat = userLocation?.lat || 52.3676;
      const lng = userLocation?.lng || 4.9041;
      
      setResults([{
        id: 'custom-0',
        name: searchQuery,
        address: `Sportschool toevoegen`,
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
    debounce((q: string) => searchGyms(q), 600),
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

      {/* Search hint */}
      {showResults && query.length >= 1 && query.length < 3 && (
        <View style={[styles.hintContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
          <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#FFB800" />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 }}>
            💡 Tip: Typ "Basic-Fit Rotterdam" om alle Basic-Fit locaties in Rotterdam te zien
          </Text>
        </View>
      )}

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
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Probeer "gym naam + stad"{'\n'}bijv. "Basic-Fit Amsterdam"
          </Text>
        </View>
      )}
    </View>
  );
}

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
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
    maxHeight: 350,
    overflow: 'hidden',
  },
  resultsList: {
    maxHeight: 350,
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
