import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import GetLocation from 'react-native-get-location';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

// Google Places API key provided by user
const GOOGLE_PLACES_API_KEY = 'AIzaSyDqJtH6hpF1i1ct9qHzKsqHh4wzMwZTzfw';

interface PlaceGeometry {
  location: {
    lat: number;
    lng: number;
  };
}

interface MarketResult {
  place_id: string;
  name: string;
  geometry: PlaceGeometry;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface Market extends MarketResult {
  distance?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const NearbyMarketsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permission de localisation',
            message: 'Cette application a besoin de votre localisation pour trouver les marchés à proximité.',
            buttonNeutral: 'Demander plus tard',
            buttonNegative: 'Annuler',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('Permission de localisation refusée.');
          setLoading(false);
          return;
        }
      }
      // For iOS, ensure NSLocationWhenInUseUsageDescription is in Info.plist
      // The permission request is handled by react-native-get-location itself for iOS

      fetchCurrentUserLocation();
    };
    initialize();
  }, []);

  const fetchCurrentUserLocation = () => {
    setLoading(true);
    setError(null);
    GetLocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 60000, // 60 seconds
    })
    .then(location => {
      setUserLocation({ latitude: location.latitude, longitude: location.longitude });
      fetchNearbyMarkets(location.latitude, location.longitude);
    })
    .catch(error => {
      const { code, message } = error;
      console.warn(`LOCATION_ERROR ${code}: ${message}`);
      setError('Impossible d\'obtenir votre position. Veuillez vérifier vos paramètres de localisation et les permissions.');
      setLoading(false);
    });
  };

  const fetchNearbyMarkets = async (latitude: number, longitude: number) => {
    const radius = 5000; // 5km search radius
    const type = 'market'; // As per user's request, can be extended e.g. 'grocery_or_supermarket|store'
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&keyword=marché|supermarché|épicerie&language=fr&key=${GOOGLE_PLACES_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.status === 'OK') {
        const fetchedMarkets: Market[] = data.results.map((place: MarketResult) => ({
          ...place,
          distance: calculateDistance(
            latitude, longitude,
            place.geometry.location.lat, place.geometry.location.lng
          ),
        }));
        fetchedMarkets.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        setMarkets(fetchedMarkets);
        if (fetchedMarkets.length === 0) {
            setError('Aucun marché trouvé dans un rayon de 5km.');
        }
      } else {
        console.warn('PLACES_API_ERROR:', data.status, data.error_message);
        setError(data.error_message || 'Erreur lors de la recherche de marchés. Status: ' + data.status);
      }
    } catch (err: any) {
      console.error('FETCH_MARKETS_ERROR:', err);
      setError('Une erreur réseau est survenue lors de la recherche des marchés.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return parseFloat(d.toFixed(1));
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  const handleOpenMap = (market: Market) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${market.geometry.location.lat},${market.geometry.location.lng}`;
    const label = market.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de cartes.');
        }
      });
    } else {
        Alert.alert('Erreur', 'URL de carte non supportée sur cette plateforme.');
    }
  };

  if (loading && !userLocation) { // Initial loading for location
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Obtention de votre position...</Text>
      </View>
    );
  }

  if (error && markets.length === 0) { // Show error only if no markets are loaded and there's an error
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={60} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchCurrentUserLocation} // Retry fetching location
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButtonMap}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      {userLocation && (
        <MapView
          provider={PROVIDER_GOOGLE} // Ensures Google Maps is used on Android
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.0922, // Standard zoom level
            longitudeDelta: 0.0421, // Standard zoom level
          }}
          showsUserLocation={true}
        >
          {markets.map(market => (
            <Marker
              key={market.place_id}
              coordinate={{
                latitude: market.geometry.location.lat,
                longitude: market.geometry.location.lng,
              }}
              title={market.name}
              description={market.vicinity || `Distance: ${market.distance} km`}
              pinColor="#4CAF50"
              onCalloutPress={() => handleOpenMap(market)} // Open map on callout press
            />
          ))}
        </MapView>
      )}
      {loading && markets.length === 0 && <ActivityIndicator style={styles.mapLoadingIndicator} size="large" color="#4CAF50"/>}

      <View style={styles.marketListContainer}>
        <Text style={styles.marketListTitle}>Marchés à proximité ({markets.length})</Text>
        {markets.length > 0 ? (
          markets.map((market) => (
            <TouchableOpacity
              key={market.place_id}
              style={styles.marketItem}
              onPress={() => handleOpenMap(market)}
            >
              <Icon name="location-sharp" size={24} color="#4CAF50" />
              <View style={styles.marketItemTextContainer}>
                <Text style={styles.marketItemName}>{market.name}</Text>
                {market.vicinity && <Text style={styles.marketItemVicinity}>{market.vicinity}</Text>}
                {market.distance !== undefined && <Text style={styles.marketItemDistance}>{market.distance} km</Text>}
              </View>
              <Icon name="chevron-forward" size={24} color="#757575" />
            </TouchableOpacity>
          ))
        ) : (
          !loading && <Text style={styles.noMarketsText}>{error || 'Aucun marché trouvé.'}</Text>
        )}
        {loading && markets.length > 0 && <ActivityIndicator size="small" color="#4CAF50" style={{marginTop: 10}}/>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4CAF50',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 15,
    padding: 10,
  },
  backButtonText: {
    color: '#4285F4',
    fontSize: 16,
  },
  map: {
    height: '50%', // Or flex: 1 if you want it to take more space initially
    width: '100%',
  },
  mapLoadingIndicator: {
    position: 'absolute',
    top: '25%', // Center on map area
    left: '50%',
    marginLeft: -20, // Half of its size
  },
  backButtonMap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20, // Adjust for status bar
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10, // Ensure it's above the map
  },
  marketListContainer: {
    height: '50%', // Or flex: 1
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  marketListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  marketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  marketItemTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  marketItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  marketItemVicinity: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  marketItemDistance: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  noMarketsText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default NearbyMarketsScreen;
