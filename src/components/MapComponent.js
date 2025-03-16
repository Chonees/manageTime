import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

const MapComponent = ({ locations, currentLocation, isLoading }) => {
  const [region, setRegion] = useState({
    latitude: -34.603722,
    longitude: -58.381592,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [mapReady, setMapReady] = useState(false);

  // Actualizar la región del mapa cuando cambian las ubicaciones
  useEffect(() => {
    if (locations && locations.length > 0) {
      // Usar la ubicación más reciente como centro del mapa
      const mostRecent = locations.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      
      setRegion({
        latitude: mostRecent.latitude,
        longitude: mostRecent.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } else if (currentLocation) {
      // Si no hay historial pero sí ubicación actual
      setRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [locations, currentLocation]);

  // Crear puntos para la línea que conecta las ubicaciones
  const getPolylineCoordinates = () => {
    if (!locations || locations.length === 0) return [];
    
    // Ordenar ubicaciones por fecha
    const sortedLocations = [...locations].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    return sortedLocations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
  };

  // Formatear fecha para mostrar en los marcadores
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  // Renderizar una vista alternativa en Android para evitar problemas
  if (Platform.OS === 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeTitle}>Historial de Ubicaciones</Text>
          {locations && locations.length > 0 ? (
            <View style={styles.locationsList}>
              {locations.map((location, index) => (
                <View key={location.id || index} style={styles.locationItem}>
                  <Text style={styles.locationType}>
                    {location.type === 'start' ? '🟢 Inicio' : '🔴 Fin'}
                  </Text>
                  <Text style={styles.locationCoords}>
                    Lat: {location.latitude.toFixed(6)}, Lon: {location.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationTime}>
                    {formatDate(location.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No hay datos de ubicación disponibles</Text>
          )}
        </View>
      </View>
    );
  }

  // Renderizar el mapa en iOS
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={() => setMapReady(true)}
      >
        {mapReady && locations && locations.map((location, index) => (
          <Marker
            key={location.id || index}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.type === 'start' ? 'Inicio de trabajo' : 'Fin de trabajo'}
            description={formatDate(location.timestamp)}
            pinColor={location.type === 'start' ? '#4CAF50' : '#F44336'}
          />
        ))}
        
        {mapReady && currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Ubicación actual"
            description="Tu ubicación en este momento"
            pinColor="#2196F3"
          />
        )}
        
        {mapReady && locations && locations.length > 1 && (
          <Polyline
            coordinates={getPolylineCoordinates()}
            strokeColor="#4A90E2"
            strokeWidth={3}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get('window').height * 0.6,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    height: Dimensions.get('window').height * 0.6,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginVertical: 10,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  alternativeContainer: {
    height: '100%',
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
  },
  alternativeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 15,
    textAlign: 'center',
  },
  locationsList: {
    flex: 1,
  },
  locationItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationType: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  locationCoords: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  locationTime: {
    fontSize: 14,
    color: '#999',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  }
});

export default MapComponent;
