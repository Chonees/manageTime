import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const LocationComponent = ({ onLocationPermissionChange }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const getLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      console.log('Requesting location permissions...');
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Permission status:', status);
      
      const isGranted = status === 'granted';
      setPermissionGranted(isGranted);
      
      // Notify parent component about permission status
      if (onLocationPermissionChange) {
        onLocationPermissionChange(isGranted);
      }
      
      if (!isGranted) {
        setErrorMsg('Esta aplicación requiere acceso a tu ubicación para funcionar. Por favor, habilita los servicios de ubicación en la configuración de tu dispositivo.');
        setLoading(false);
        return;
      }
      
      console.log('Getting current position...');
      // Get the current location with a timeout
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        timeout: 15000, // 15 second timeout
        maximumAge: 10000, // Accept positions that are up to 10 seconds old
      });
      
      console.log('Location received:', currentLocation ? 'success' : 'null');
      
      if (!currentLocation) {
        throw new Error('Location data is null');
      }
      
      setLocation(currentLocation);
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg('No se pudo obtener la ubicación: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Get location when component mounts
  useEffect(() => {
    getLocation();
  }, []);

  // Render different content based on state
  let content;
  
  if (loading) {
    content = (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.messageText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  } else if (errorMsg) {
    content = (
      <View style={styles.messageContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, {marginTop: 10}]} 
          onPress={getLocation}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (location) {
    // Ensure location coordinates are valid numbers
    const latitude = typeof location.coords.latitude === 'number' ? location.coords.latitude : 0;
    const longitude = typeof location.coords.longitude === 'number' ? location.coords.longitude : 0;
    
    content = (
      <View style={styles.locationInfoContainer}>
        <MapView 
          style={styles.map}
          initialRegion={{
            latitude: latitude,
            longitude: longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker
            coordinate={{
              latitude: latitude,
              longitude: longitude,
            }}
            title="Mi ubicación"
            description="Estoy aquí"
          />
        </MapView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Mi Ubicación</Text>
        </View>
        {content}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={getLocation}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>
            {loading ? 'Actualizando...' : 'Actualizar Ubicación'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#4A90E2',
    padding: 15,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  locationInfoContainer: {
    padding: 20,
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 15,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  locationText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 5,
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LocationComponent;