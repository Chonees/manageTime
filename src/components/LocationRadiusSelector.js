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
  Platform
} from 'react-native';
import Slider from '@react-native-community/slider';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { mapConfig } from '../services/platform-config';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const LocationRadiusSelector = ({ 
  visible, 
  onClose, 
  onSave, 
  initialLocation = null, 
  initialRadius = 1.0,
  initialLocationName = ''
}) => {
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
        console.log('Permiso de ubicación denegado');
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
          
          setLocationName(locationText || 'Ubicación actual');
        }
      } catch (error) {
        console.error('Error al obtener nombre de ubicación:', error);
      }
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
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
      return `${Math.round(distance * 1000)} m`;
    } else {
      // Si es 1 km o más, mostrar en km con un decimal
      return `${distance.toFixed(1)} km`;
    }
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
          <Text style={styles.title}>Añadir ubicación</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Aplicar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar"
            value={locationName}
            onChangeText={setLocationName}
          />
        </View>

        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
          ) : (
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
          )}
        </View>

        <View style={styles.radiusContainer}>
          <Text style={styles.radiusTitle}>Radio personalizado</Text>
          <Text style={styles.radiusSubtitle}>
            Mostrarme únicamente publicaciones dentro de una distancia específica.
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
            <Text style={styles.mapActionButtonText}>Colocar aquí</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mapActionButton}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={24} color="#4A90E2" />
            <Text style={styles.mapActionButtonText}>Mi ubicación</Text>
          </TouchableOpacity>
        </View>

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
});

export default LocationRadiusSelector;
