import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text, Platform, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { mapConfig } from '../services/platform-config';
import { useLanguage } from '../context/LanguageContext';

const MapComponent = ({ locations, currentLocation, isLoading, selectedUserName }) => {
  const { strings, language } = useLanguage();
  
  // Debug logs
  console.log("MapComponent - Current language:", language);
  
  const [region, setRegion] = useState({
    latitude: -34.603722,
    longitude: -58.381592,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [workSessions, setWorkSessions] = useState([]);

  // Agrupar ubicaciones por sesiones de trabajo
  useEffect(() => {
    if (locations && locations.length > 0) {
      const sessions = [];
      let currentSession = null;
      
      // Ordenar ubicaciones por fecha
      const sortedLocations = [...locations].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      sortedLocations.forEach(location => {
        if (location.type === 'start') {
          // Iniciar una nueva sesión
          currentSession = {
            startLocation: location,
            endLocation: null,
            points: [location],
            startTime: new Date(location.timestamp),
            endTime: null
          };
        } else if (location.type === 'end' && currentSession) {
          // Finalizar la sesión actual
          currentSession.endLocation = location;
          currentSession.points.push(location);
          currentSession.endTime = new Date(location.timestamp);
          sessions.push(currentSession);
          currentSession = null;
        } else if (location.type === 'tracking' && currentSession) {
          // Añadir punto de seguimiento a la sesión actual
          currentSession.points.push(location);
        }
      });
      
      // Si hay una sesión sin finalizar, añadirla también
      if (currentSession) {
        sessions.push(currentSession);
      }
      
      setWorkSessions(sessions);
      
      // Centrar el mapa en la ubicación más reciente
      if (sortedLocations.length > 0) {
        const mostRecent = sortedLocations[sortedLocations.length - 1];
        setRegion({
          latitude: mostRecent.latitude,
          longitude: mostRecent.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
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

  // Formatear fecha para mostrar en los marcadores
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Calcular duración de la sesión
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return strings?.inProgress || 'En progreso';
    
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Manejar errores del mapa
  const handleMapError = (error) => {
    console.error('Error en el mapa:', error);
    setMapError(true);
    Alert.alert(
      strings?.mapError || 'Error en el mapa',
      strings?.mapLoadError || 'No se pudo cargar el mapa. Se mostrará una vista alternativa.',
      [{ text: strings?.ok || 'OK' }]
    );
  };

  // Generar colores aleatorios pero consistentes para cada sesión
  const getSessionColor = (index) => {
    const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#795548', '#607D8B'];
    return colors[index % colors.length];
  };

  // Colores para los marcadores
  const markerColors = {
    start: '#4CAF50', // Verde
    end: '#F44336',   // Rojo
    current: '#2196F3' // Azul
  };

  // Mostrar información al tocar un marcador
  const showMarkerInfo = (title, details) => {
    Alert.alert(title, details, [{ text: 'OK' }]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>{strings?.loadingMap || 'Cargando mapa...'}</Text>
      </View>
    );
  }

  // Si hay un error con el mapa, mostrar la vista alternativa
  if (mapError) {
    return (
      <View style={styles.container}>
        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeTitle}>
            {selectedUserName ? 
              `${strings?.mapOf || 'Historial de'} ${selectedUserName}` : 
              strings?.locationHistoryTitle || 'Historial de Ubicaciones'}
          </Text>
          {locations && locations.length > 0 ? (
            <View style={styles.locationsList}>
              {locations.map((location, index) => (
                <View key={location._id || index} style={styles.locationItem}>
                  <Text style={styles.locationType}>
                    {location.type === 'start' ? 
                      `🟢 ${strings?.startedWorking || 'Inicio'}` : 
                      location.type === 'end' ? 
                      `🔴 ${strings?.stoppedWorking || 'Fin'}` : 
                      `🔵 ${strings?.updatedLocation || 'Seguimiento'}`}
                  </Text>
                  <Text style={styles.locationCoords}>
                    {strings?.latitude || 'Lat'}: {location.latitude.toFixed(6)}, 
                    {strings?.longitude || 'Lon'}: {location.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationTime}>
                    {formatDate(location.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>{strings?.noLocations || 'No hay datos de ubicación disponibles'}</Text>
          )}
        </View>
      </View>
    );
  }

  // Usar el mismo componente de mapa para iOS y Android con configuración específica de plataforma
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : null}
        showsUserLocation={mapConfig.showsUserLocation}
        showsMyLocationButton={mapConfig.showsMyLocationButton}
        toolbarEnabled={Platform.OS === 'android' ? mapConfig.toolbarEnabled : undefined}
        showsCompass={Platform.OS === 'ios' ? mapConfig.showsCompass : undefined}
        onMapReady={() => setMapReady(true)}
        onError={handleMapError}
      >
        {mapReady && workSessions.map((session, sessionIndex) => (
          <React.Fragment key={`session-${sessionIndex}`}>
            {/* Línea que conecta los puntos de la sesión */}
            <Polyline
              coordinates={session.points.map(point => ({
                latitude: point.latitude,
                longitude: point.longitude,
              }))}
              strokeColor={getSessionColor(sessionIndex)}
              strokeWidth={4}
            />
            
            {/* Marcador de inicio */}
            {session.startLocation && (
              <Marker
                coordinate={{
                  latitude: session.startLocation.latitude,
                  longitude: session.startLocation.longitude,
                }}
                title={strings?.startedWorking || 'Inicio de trabajo'}
                description={formatDate(session.startLocation.timestamp)}
                pinColor={markerColors.start}
                onPress={() => showMarkerInfo(
                  strings?.startedWorking || 'Inicio de trabajo',
                  `${strings?.registeredAt || 'Fecha'}: ${formatDate(session.startLocation.timestamp)}\n${
                    session.endTime ? `${strings?.duration || 'Duración'}: ${calculateDuration(session.startTime, session.endTime)}\n` : ''
                  }${selectedUserName ? `${strings?.user || 'Usuario'}: ${selectedUserName}` : ''}`
                )}
              />
            )}
            
            {/* Marcador de fin */}
            {session.endLocation && (
              <Marker
                coordinate={{
                  latitude: session.endLocation.latitude,
                  longitude: session.endLocation.longitude,
                }}
                title={strings?.stoppedWorking || 'Fin de trabajo'}
                description={formatDate(session.endLocation.timestamp)}
                pinColor={markerColors.end}
                onPress={() => showMarkerInfo(
                  strings?.stoppedWorking || 'Fin de trabajo',
                  `${strings?.registeredAt || 'Fecha'}: ${formatDate(session.endLocation.timestamp)}\n${
                    session.endTime ? `${strings?.duration || 'Duración'}: ${calculateDuration(session.startTime, session.endTime)}\n` : ''
                  }${selectedUserName ? `${strings?.user || 'Usuario'}: ${selectedUserName}` : ''}`
                )}
              />
            )}
          </React.Fragment>
        ))}
        
        {mapReady && currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title={strings?.currentLocation || 'Ubicación actual'}
            description={strings?.currentLocationDesc || 'Tu ubicación en este momento'}
            pinColor={markerColors.current}
            onPress={() => showMarkerInfo(
              strings?.currentLocation || 'Ubicación actual',
              `${strings?.registeredAt || 'Fecha'}: ${formatDate(new Date().toISOString())}\n${
                selectedUserName ? `${strings?.user || 'Usuario'}: ${selectedUserName}` : ''
              }`
            )}
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
