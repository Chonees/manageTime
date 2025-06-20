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
  StatusBar,
  Alert,
  Keyboard

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
  const [searchQuery, setSearchQuery] = useState(initialLocationName);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
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
          setSearchQuery(locationText || t('currentLocation'));
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
    
    // Actualizar el nombre de la ubicación basado en las nuevas coordenadas
    updateLocationNameFromCoordinates(latitude, longitude);
  };

  // Actualizar nombre de ubicación basado en coordenadas
  const updateLocationNameFromCoordinates = async (latitude, longitude) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (address) {
        const locationText = [
          address.name,
          address.street,
          address.city, 
          address.region, 
          address.district
        ].filter(Boolean).join(', ');
        
        setLocationName(locationText || t('selectedLocation'));
        setSearchQuery(locationText || t('selectedLocation'));
      }
    } catch (error) {
      console.error(t('errorGettingLocationName'), error);
    }
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
          
          // Actualizar el nombre de la ubicación basado en las nuevas coordenadas
          updateLocationNameFromCoordinates(camera.center.latitude, camera.center.longitude);
        }
      } catch (error) {
        console.error('Error al obtener el centro del mapa:', error);
      }
    }
  };

  // Buscar ubicación por nombre o dirección
  const searchLocation = async (query) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      console.log(`Buscando ubicación: "${query}"`);
      
      // Cerrar el teclado
      Keyboard.dismiss();
      
      // Buscar ubicación usando geocodificación de Location
      const results = await Location.geocodeAsync(query);
      
      if (results && results.length > 0) {
        console.log(`Se encontró la ubicación buscada: ${JSON.stringify(results[0])}`);
        
        // Actualizar la ubicación con la primera coincidencia
        const { latitude, longitude } = results[0];
        
        // Actualizar estado
        setLocation(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
        
        // Mover el mapa a la ubicación encontrada
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: LATITUDE_DELTA / 2,  // Zoom un poco más cerca
            longitudeDelta: LONGITUDE_DELTA / 2,
          }, 1000);  // Animación de 1 segundo
        }
        
        // Actualizar el nombre de la ubicación
        updateLocationNameFromCoordinates(latitude, longitude);
        
        // Mostrar mensaje de éxito
        console.log(`Mapa centrado en ubicación: ${latitude}, ${longitude}`);
      } else {
        // No se encontraron resultados
        console.log('No se encontraron resultados para la búsqueda');
        Alert.alert(
          t('noResults'),
          t('noLocationResults'),
          [{ text: t('ok') }]
        );
      }
    } catch (error) {
      console.error('Error al buscar ubicación:', error);
      Alert.alert(
        t('error'),
        t('errorSearchingLocation'),
        [{ text: t('ok') }]
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Manejador para cambios en el campo de búsqueda
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setLocationName(text);  // También actualizamos el nombre de la ubicación
  };

  // Manejador para enviar la búsqueda (al presionar enter o el botón de búsqueda)
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      searchLocation(searchQuery);
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
            t('saveLocationPrompt') || 'Please enter a name for this location',
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
      setLoading(true);
      
      // Create location object
      const locationData = {
        name: name,
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        radius: radius
      };
      
      // Importar y usar la API que guarda en el backend
      const apiLocations = require('../services/api-locations');
      
      try {
        // Guardar en el backend usando la API
        const savedLocation = await apiLocations.saveLocation(locationData);
        console.log('Location saved successfully to server:', savedLocation);
        
        // Show success message
        Alert.alert(
          t('success') || 'Success',
          t('locationSaved') || 'Location saved successfully to server',
          [{ text: t('ok') || 'OK' }]
        );
        
        // Update location name in the UI
        setLocationName(name);
        setSearchQuery(name);
      } catch (apiError) {
        console.error('Error saving location to backend:', apiError);
        Alert.alert(
          t('error') || 'Error',
          t('errorSavingLocationToBackend') || 'Error saving location to server. Please check your connection.',
          [{ text: t('ok') || 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error in saveLocationWithName:', error);
      Alert.alert(
        t('error') || 'Error',
        t('errorSavingLocation') || 'Error saving location',
        [{ text: t('ok') || 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1c1c1c" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#fff3e5" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('addLocation')}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{t('apply')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#fff3e5" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchLocation')}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearchButton} 
              onPress={() => {
                setSearchQuery('');
                setLocationName('');
              }}
            >
              <Ionicons name="close-circle" size={20} color="#fff3e5" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearchSubmit}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff3e5" />
            ) : (
              <Ionicons name="navigate" size={20} color="#fff3e5" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff3e5" />
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
                  // Actualizar el nombre de la ubicación basado en las nuevas coordenadas
                  updateLocationNameFromCoordinates(latitude, longitude);
                }}
              >
                {/* Renderizar marcador y círculo solo si las coordenadas son válidas */}
                {validateCoordinates(location) && (
                  <>
                    <Marker
                      coordinate={{
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude)
                      }}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    />
                    <Circle
                      center={{
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude)
                      }}
                      radius={getRadiusInMeters()}
                      fillColor="rgba(45, 137, 239, 0.2)"
                      strokeColor="rgba(45, 137, 239, 0.5)"
                      strokeWidth={2}
                    />
                  </>
                )}
              </MapView>
            ) : (
              // Renderizado para Android y otros
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
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
                  // Actualizar el nombre de la ubicación basado en las nuevas coordenadas
                  updateLocationNameFromCoordinates(latitude, longitude);
                }}
              >
                {/* Renderizar marcador y círculo solo si las coordenadas son válidas */}
                {validateCoordinates(location) && (
                  <>
                    <Marker
                      coordinate={{
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude)
                      }}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    />
                    <Circle
                      center={{
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude)
                      }}
                      radius={getRadiusInMeters()}
                      fillColor="rgba(45, 137, 239, 0.2)"
                      strokeColor="rgba(45, 137, 239, 0.5)"
                      strokeWidth={2}
                    />
                  </>
                )}
              </MapView>
            )
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={24} color="#fff3e5" />
            <Text style={styles.actionButtonText}>{t('myLocation')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={placeMarkerAtCenter}
          >
            <Ionicons name="flag" size={24} color="#fff3e5" />
            <Text style={styles.actionButtonText}>{t('placeHere')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={saveLocation}
          >
            <Ionicons name="bookmark" size={24} color="#fff3e5" />
            <Text style={styles.actionButtonText}>{t('saveLocation')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.radiusContainer}>
          <Text style={styles.radiusTitle}>{t('customRadius')}</Text>
          <Text style={styles.radiusDescription}>{t('radiusDescription')}</Text>
          
          <View style={styles.sliderContainer}>
            <Text style={styles.radiusValue}>{formatDistance(radius)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={5.0}
              step={0.1}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor="#fff3e5"
              maximumTrackTintColor="#4a4a4a"
              thumbTintColor="#fff3e5"
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1c1c1c',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  closeButton: {
    padding: 5,
  },
  saveButton: {
    backgroundColor: '#fff3e5',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  saveButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    margin: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.3)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#fff3e5',
    paddingVertical: 8,
  },
  clearSearchButton: {
    padding: 5,
  },
  searchButton: {
    marginLeft: 5,
    backgroundColor: 'rgba(255, 243, 229, 0.2)',
    padding: 5,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff3e5',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    padding: 10,
    borderRadius: 10,
    width: width / 3.5,
  },
  actionButtonText: {
    color: '#fff3e5',
    fontSize: 12,
    marginTop: 5,
  },
  radiusContainer: {
    backgroundColor: '#1c1c1c',
    margin: 10,
    borderRadius: 10,
    padding: 15,
  },
  radiusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 5,
  },
  radiusDescription: {
    fontSize: 12,
    color: '#fff3e5',
    opacity: 0.7,
    marginBottom: 10,
  },
  sliderContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  radiusValue: {
    color: '#fff3e5',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default LocationRadiusSelector;
