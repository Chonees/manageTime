import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Dimensions, 
  TouchableOpacity, 
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import Slider from '@react-native-community/slider';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { mapConfig } from '../services/platform-config';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const STORAGE_KEYS = {
  SAVED_LOCATIONS: `${Platform.OS}_saved_locations`
};

const LocationRadiusSelector = ({ 
  visible, 
  onClose, 
  onSave, 
  initialLocation = null, 
  initialRadius = 1.0,
  initialLocationName = ''
}) => {
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(initialLocation || {
    latitude: -34.603722,
    longitude: -58.381592,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [radius, setRadius] = useState(initialRadius); // Radio en km
  const [locationName, setLocationName] = useState(initialLocationName);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  // Obtener la ubicación actual del dispositivo al abrir el selector
  useEffect(() => {
    if (visible && !initialLocation) {
      getCurrentLocation();
    } else if (initialLocation) {
      setLocation({
        ...initialLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  }, [visible, initialLocation]);

  // Función para obtener la ubicación actual
  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log(t('locationPermissionDenied'));
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
      
      // Intentar obtener el nombre de la ubicación actual
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        
        if (address) {
          const locationText = [
            address.city, 
            address.region, 
            address.district
          ].filter(Boolean).join(', ');
          
          setLocationName(locationText || t('currentLocation'));
        }
      } catch (error) {
        console.error(t('errorGettingLocationName'), error);
      }
    } catch (error) {
      console.error(t('errorGettingLocation'), error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de ubicación al mover el marcador
  const handleMarkerDragEnd = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLocation(prev => ({
      ...prev,
      latitude,
      longitude
    }));
  };

  // Colocar el marcador en el centro actual del mapa
  const placeMarkerAtCenter = async () => {
    if (mapRef.current) {
      try {
        const camera = await mapRef.current.getCamera();
        if (camera) {
          setLocation(prev => ({
            ...prev,
            latitude: camera.center.latitude,
            longitude: camera.center.longitude
          }));
        }
      } catch (error) {
        console.error('Error al obtener el centro del mapa:', error);
      }
    }
  };

  // Convertir radio en kilómetros a metros para el círculo del mapa
  const getRadiusInMeters = () => {
    return radius * 1000; // Convertir de km a metros
  };

  // Formatear distancia para mostrar en UI
  const formatDistance = (distance) => {
    if (distance < 1) {
      // Si es menos de 1 km, mostrar en metros
      return `${Math.round(distance * 1000)} ${t('meters')}`;
    } else {
      // Si es 1 km o más, mostrar en km con un decimal
      return `${distance.toFixed(1)} ${t('kilometers')}`;
    }
  };

  // Validar coordenadas para evitar errores en iOS
  const validateCoordinates = (coords) => {
    if (!coords) return false;
    const lat = coords.latitude;
    const lng = coords.longitude;
    return (
      typeof lat === 'number' && 
      !isNaN(lat) && 
      typeof lng === 'number' && 
      !isNaN(lng)
    );
  };

  // Aplicar selección y cerrar el modal
  const handleSave = () => {
    onSave({
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      radius,
      locationName
    });
    onClose();
  };

  // Save the current location to local storage
  const saveLocation = async () => {
    try {
      // Prompt user for location name if not already set
      if (!locationName) {
        if (Platform.OS === 'ios') {
          // iOS supports prompt in Alert
          Alert.prompt(
            t('saveLocation') || 'Save Location',
            t('enterLocationName') || 'Enter a name for this location',
            [
              {
                text: t('cancel') || 'Cancel',
                style: 'cancel'
              },
              {
                text: t('save') || 'Save',
                onPress: (name) => {
                  if (name && name.trim()) {
                    saveLocationWithName(name.trim());
                  } else {
                    Alert.alert(
                      t('error') || 'Error',
                      t('locationNameRequired') || 'Location name is required',
                      [{ text: t('ok') || 'OK' }]
                    );
                  }
                }
              }
            ],
            'plain-text'
          );
        } else {
          // Android doesn't support prompt, use a default name
          const defaultName = `${t('location') || 'Location'} ${new Date().toLocaleString()}`;
          Alert.alert(
            t('saveLocation') || 'Save Location',
            `${t('locationWillBeSavedAs') || 'Location will be saved as'}: ${defaultName}`,
            [
              {
                text: t('cancel') || 'Cancel',
                style: 'cancel'
              },
              {
                text: t('save') || 'Save',
                onPress: () => saveLocationWithName(defaultName)
              }
            ]
          );
        }
      } else {
        // Use existing location name
        saveLocationWithName(locationName);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert(
        t('error') || 'Error',
        t('errorSavingLocation') || 'Error saving location',
        [{ text: t('ok') || 'OK' }]
      );
    }
  };

  // Save location with the provided name
  const saveLocationWithName = async (name) => {
    try {
      console.log('Saving location with name:', name);
      
      // Create location object
      const locationData = {
        _id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: name,
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        radius: radius,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Get existing saved locations
      const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
      let locations = [];
      
      if (locationsJson) {
        try {
          locations = JSON.parse(locationsJson);
        } catch (error) {
          console.error('Error parsing saved locations:', error);
          locations = [];
        }
      }
      
      // Add new location to the beginning of the array
      locations.unshift(locationData);
      
      // Save updated locations to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(locations));
      
      // Show success message
      Alert.alert(
        t('success') || 'Success',
        t('locationSaved') || 'Location saved successfully',
        [{ text: t('ok') || 'OK' }]
      );
      
      // Update location name in the UI
      setLocationName(name);
      
      console.log('Location saved successfully');
    } catch (error) {
      console.error('Error saving location with name:', error);
      Alert.alert(
        t('error') || 'Error',
        t('errorSavingLocation') || 'Error saving location',
        [{ text: t('ok') || 'OK' }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('addLocation')}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{t('apply')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search')}
            value={locationName}
            onChangeText={setLocationName}
          />
        </View>

        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>{t('loadingMap')}</Text>
            </View>
          ) : (
            Platform.OS === 'ios' ? (
              // Renderizado específico para iOS
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: Number(location.latitude) || 0,
                  longitude: Number(location.longitude) || 0,
                  latitudeDelta: LATITUDE_DELTA,
                  longitudeDelta: LONGITUDE_DELTA,
                }}
                region={{
                  latitude: Number(location.latitude) || 0,
                  longitude: Number(location.longitude) || 0,
                  latitudeDelta: LATITUDE_DELTA,
                  longitudeDelta: LONGITUDE_DELTA,
                }}
                onMapReady={() => setMapReady(true)}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setLocation(prev => ({
                    ...prev,
                    latitude: Number(latitude),
                    longitude: Number(longitude)
                  }));
                }}
              >
                {mapReady && validateCoordinates(location) && (
                  <>
                    <Marker
                      coordinate={{
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude)
                      }}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    />
                    {validateCoordinates(location) && (
                      <Circle
                        center={{
                          latitude: Number(location.latitude),
                          longitude: Number(location.longitude)
                        }}
                        radius={getRadiusInMeters()}
                        fillColor="rgba(74, 144, 226, 0.2)"
                        strokeColor="rgba(74, 144, 226, 0.8)"
                        strokeWidth={2}
                      />
                    )}
                  </>
                )}
              </MapView>
            ) : (
              // Renderizado para Android
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                onMapReady={() => setMapReady(true)}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setLocation(prev => ({
                    ...prev,
                    latitude,
                    longitude
                  }));
                }}
                {...mapConfig}
              >
                {mapReady && (
                  <>
                    <Marker
                      coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude
                      }}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    />
                    <Circle
                      center={{
                        latitude: location.latitude,
                        longitude: location.longitude
                      }}
                      radius={getRadiusInMeters()}
                      fillColor="rgba(74, 144, 226, 0.2)"
                      strokeColor="rgba(74, 144, 226, 0.8)"
                      strokeWidth={2}
                    />
                  </>
                )}
              </MapView>
            )
          )}
        </View>

        <View style={styles.radiusContainer}>
          <Text style={styles.radiusTitle}>{t('customRadius')}</Text>
          <Text style={styles.radiusSubtitle}>
            {t('radiusDescription')}
          </Text>
          
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={10}
              step={0.1}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor="#4A90E2"
              maximumTrackTintColor="#D9D9D9"
              thumbTintColor="#4A90E2"
            />
            <Text style={styles.radiusValue}>{formatDistance(radius)}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.mapActionButton}
            onPress={placeMarkerAtCenter}
          >
            <Ionicons name="locate-outline" size={24} color="#4A90E2" />
            <Text style={styles.mapActionButtonText}>{t('placeHere')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mapActionButton}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={24} color="#4A90E2" />
            <Text style={styles.mapActionButtonText}>{t('myLocation')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Save Location Button */}
        <TouchableOpacity 
          style={styles.saveLocationButton}
          onPress={saveLocation}
        >
          <Ionicons name="bookmark-outline" size={24} color="#fff" />
          <Text style={styles.saveLocationButtonText}>{t('saveLocation') || 'Save Location'}</Text>
        </TouchableOpacity>

      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#4A90E2',
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
  },
  mapContainer: {
    height: height * 0.4,
    width: '100%',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  radiusContainer: {
    padding: 15,
  },
  radiusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  radiusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  radiusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    width: 60,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  mapActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    flex: 0.48,
  },
  mapActionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4A90E2',
  },
  saveLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  saveLocationButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default LocationRadiusSelector;
