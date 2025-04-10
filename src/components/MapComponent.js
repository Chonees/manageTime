import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text, Platform, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout, Circle } from 'react-native-maps';
import { mapConfig } from '../services/platform-config';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const MapComponent = ({ locations, currentLocation, isLoading, selectedUserName, onError }) => {
  const { t } = useLanguage();
  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [workSessions, setWorkSessions] = useState([]);
  const [taskEvents, setTaskEvents] = useState([]);

  useEffect(() => {
    // First check if we have current location
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      setRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      return;
    }
    
    // Then check if we have locations
    if (locations && locations.length > 0) {
      // Sort locations by timestamp
      const sortedLocations = [...locations].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateA - dateB;
      });
      
      // Process locations
      const processedSessions = [];
      let currentSession = { points: [], startLocation: null, endLocation: null, startTime: null, endTime: null };
      
      // Group locations into work sessions (start-end pairs)
      sortedLocations.forEach(location => {
        // Skip locations without coordinates
        if (!location.latitude && !location.longitude && 
            (!location.location || !location.location.coordinates)) {
          return;
        }
        
        // Normalize location format
        const normalizedLocation = {
          ...location,
          latitude: location.latitude || (location.location && location.location.coordinates ? location.location.coordinates[1] : 0),
          longitude: location.longitude || (location.location && location.location.coordinates ? location.location.coordinates[0] : 0),
        };
        
        // Check if this is a start or end location
        if (location.type === 'start') {
          // Start a new session if we don't have one already
          if (currentSession.points.length > 0 && currentSession.startLocation) {
            processedSessions.push({...currentSession});
            currentSession = { points: [], startLocation: null, endLocation: null, startTime: null, endTime: null };
          }
          currentSession.startLocation = normalizedLocation;
          currentSession.startTime = new Date(location.timestamp).getTime();
          currentSession.points.push(normalizedLocation);
        } 
        else if (location.type === 'end') {
          // Add end location to current session
          currentSession.endLocation = normalizedLocation;
          currentSession.endTime = new Date(location.timestamp).getTime();
          currentSession.points.push(normalizedLocation);
          
          // Complete the session
          if (currentSession.startLocation) {
            processedSessions.push({...currentSession});
            currentSession = { points: [], startLocation: null, endLocation: null, startTime: null, endTime: null };
          }
        } 
        else {
          // Add regular location to current session
          if (currentSession.startLocation) {
            currentSession.points.push(normalizedLocation);
          }
        }
        
        // Extract task-related events
        if (location.task) {
          taskEvents.push({
            ...normalizedLocation,
            title: location.task.title,
            action: location.taskAction || 'updated',
            message: location.message || '',
            _id: location._id
          });
        }
      });
      
      // Add the last session if it wasn't completed
      if (currentSession.startLocation && currentSession.points.length > 0) {
        processedSessions.push(currentSession);
      }
      
      setWorkSessions(processedSessions);
      
      // Center the map on the most recent location
      if (sortedLocations.length > 0) {
        const mostRecent = sortedLocations[sortedLocations.length - 1];
        const latitude = mostRecent.latitude || (mostRecent.location && mostRecent.location.coordinates ? mostRecent.location.coordinates[1] : 0);
        const longitude = mostRecent.longitude || (mostRecent.location && mostRecent.location.coordinates ? mostRecent.location.coordinates[0] : 0);
        
        if (latitude && longitude) {
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      }
    }
  }, [locations, currentLocation]);

  // Format date for markers
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Calculate session duration
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return t('inProgress');
    
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Handle map errors
  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError(true);
    if (onError && typeof onError === 'function') {
      onError(error);
    }
    Alert.alert(
      t('error'),
      t('mapError'),
      [{ text: 'OK' }]
    );
  };

  // Validar coordenadas para asegurar que sean números válidos
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

  // Parse safe location - asegura que todas las propiedades existan y sean válidas
  const parseSafeLocation = (location) => {
    if (!location) return null;
    
    // Extraer coordenadas de diferentes estructuras posibles
    const lat = location.latitude || 
               (location.location && location.location.coordinates ? 
                location.location.coordinates[1] : null);
    const lng = location.longitude || 
               (location.location && location.location.coordinates ? 
                location.location.coordinates[0] : null);
    
    // Validar y convertir a números
    if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
      return null;
    }
    
    // Crear un objeto de ubicación seguro con valores por defecto para cada propiedad
    return {
      ...location,
      latitude: Number(lat),
      longitude: Number(lng),
      type: location.type || 'unknown',
      timestamp: location.timestamp || new Date().toISOString(),
      title: location.title || '',
      description: location.description || ''
    };
  };

  // Validate polyline points
  const validatePolylinePoints = (points) => {
    if (!points || !Array.isArray(points) || points.length < 2) return false;
    return points.every(point => validateCoordinates(point));
  };

  // Safe render callout - soluciona el error "Cannot convert undefined value to object"
  const renderSafeCallout = (title, description, time) => {
    // En iOS, asegurarse que todos los valores sean seguros
    if (Platform.OS === 'ios') {
      // Siempre proporcionar valores por defecto para evitar undefined
      const safeTitle = (title && typeof title === 'string') ? title : '';
      const safeDescription = (description && typeof description === 'string') ? description : '';
      const safeTime = (time && typeof time === 'string') ? time : '';
      
      return (
        <Callout tooltip>
          <View style={styles.calloutView}>
            {safeTitle !== '' && <Text style={styles.calloutTitle}>{safeTitle}</Text>}
            {safeDescription !== '' && <Text style={styles.calloutDescription}>{safeDescription}</Text>}
            {safeTime !== '' && <Text style={styles.calloutTime}>{safeTime}</Text>}
          </View>
        </Callout>
      );
    }
    
    // Para Android, implementación más estándar
    return (
      <Callout>
        <View style={styles.calloutView}>
          <Text style={styles.calloutTitle}>{title || ''}</Text>
          {description && <Text style={styles.calloutDescription}>{description}</Text>}
          {time && <Text style={styles.calloutTime}>{time}</Text>}
        </View>
      </Callout>
    );
  };

  // Get session color
  const getSessionColor = (index) => {
    const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#795548', '#607D8B'];
    return colors[index % colors.length];
  };

  // Marker colors
  const markerColors = {
    start: '#4CAF50', // Green
    end: '#F44336',   // Red
    current: '#2196F3', // Blue
    taskStart: '#9C27B0', // Purple
    taskEnd: '#FF9800' // Orange
  };

  // Show marker info
  const showMarkerInfo = (title, details) => {
    Alert.alert(title, details, [{ text: 'OK' }]);
  };

  // Get task marker color
  const getTaskMarkerColor = (taskEvent) => {
    if (taskEvent.action === 'started') {
      return markerColors.taskStart;
    } else if (taskEvent.action === 'completed') {
      return markerColors.taskEnd;
    }
    return markerColors.current;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>{t('loadingMap')}</Text>
      </View>
    );
  }

  // Show alternative view if map error occurs
  if (mapError) {
    return (
      <View style={styles.alternativeContainer}>
        <Text style={styles.alternativeTitle}>{t('locationHistory')}</Text>
        
        {locations && locations.length > 0 ? (
          <View style={styles.locationsList}>
            {locations.map((location, index) => {
              let typeText = '';
              
              if (location.type === 'start') {
                typeText = t('enterLocation');
              } else if (location.type === 'end') {
                typeText = t('exitLocation');
              } else if (location.type === 'task') {
                typeText = t('taskActivity');
              } else {
                typeText = t('locationDetails');
              }
              
              return (
                <View key={location._id || index} style={styles.locationItem}>
                  <Text style={styles.locationType}>{typeText}</Text>
                  <Text style={styles.locationCoords}>
                    {t('latitude')}: {location.latitude?.toFixed(6) || (location.location?.coordinates?.[1]?.toFixed(6) || 0)}, 
                    {t('longitude')}: {location.longitude?.toFixed(6) || (location.location?.coordinates?.[0]?.toFixed(6) || 0)}
                  </Text>
                  <Text style={styles.locationTime}>
                    {formatDate(location.timestamp)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noDataText}>{t('noLocations')}</Text>
        )}
      </View>
    );
  }

  // Renderizar el mapa para iOS con validación adicional
  const renderIOSMap = () => {
    // Filtrar y validar ubicaciones para iOS
    const validLocations = locations
      .map(parseSafeLocation)
      .filter(location => location !== null);
      
    // Filtrar y validar eventos de tareas para iOS
    const validTaskEvents = taskEvents
      .map(event => {
        if (!event) return null;
        
        // Extraer coordenadas
        const lat = event.latitude || 
                   (event.location && event.location.coordinates ? 
                    event.location.coordinates[1] : null);
        const lng = event.longitude || 
                   (event.location && event.location.coordinates ? 
                    event.location.coordinates[0] : null);
                    
        if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
          return null;
        }
        
        return {
          ...event,
          latitude: Number(lat),
          longitude: Number(lng),
          title: event.title || '',
          message: event.message || '',
          action: event.action || 'unknown',
          timestamp: event.timestamp || new Date().toISOString()
        };
      })
      .filter(event => event !== null);
    
    // Validar currentLocation para iOS
    let safeCurrentLocation = null;
    if (currentLocation) {
      if (validateCoordinates({
        latitude: Number(currentLocation.latitude),
        longitude: Number(currentLocation.longitude)
      })) {
        safeCurrentLocation = {
          latitude: Number(currentLocation.latitude),
          longitude: Number(currentLocation.longitude)
        };
      }
    }
    
    return (
      <MapView
        style={styles.map}
        provider={null} // Use native iOS maps
        initialRegion={{
          latitude: currentLocation ? Number(currentLocation.latitude) : -34.603722,
          longitude: currentLocation ? Number(currentLocation.longitude) : -58.381592,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={true}
        showsMyLocationButton={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {validLocations.map((location, index) => {
          // Solo renderizar si hay ubicaciones de sesión válidas
          // y se pueden validar sus coordenadas
          if (!location || !location.startLocation) return null;
          
          const session = {
            startLocation: parseSafeLocation(location.startLocation),
            endLocation: parseSafeLocation(location.endLocation),
            startTime: location.startLocation?.timestamp || new Date().toISOString(),
            endTime: location.endLocation?.timestamp || new Date().toISOString(),
          };
          
          if (!session.startLocation) return null;
          
          return (
            <React.Fragment key={`location-${index}`}>
              {/* Start marker */}
              <Marker
                coordinate={{
                  latitude: session.startLocation.latitude,
                  longitude: session.startLocation.longitude,
                }}
                title={t('workStarted')}
                description={formatDate(session.startLocation.timestamp)}
                pinColor={markerColors.start}
              >
                {renderSafeCallout(
                  t('workStarted'), 
                  null, 
                  formatDate(session.startLocation.timestamp)
                )}
              </Marker>
              
              {/* End marker - solo si existe */}
              {session.endLocation && (
                <Marker
                  coordinate={{
                    latitude: session.endLocation.latitude,
                    longitude: session.endLocation.longitude,
                  }}
                  title={t('workEnded')}
                  description={formatDate(session.endLocation.timestamp)}
                  pinColor={markerColors.end}
                >
                  {renderSafeCallout(
                    t('workEnded'),
                    `${t('duration')}: ${calculateDuration(session.startTime, session.endTime)}`,
                    formatDate(session.endLocation.timestamp)
                  )}
                </Marker>
              )}
            </React.Fragment>
          );
        })}
        
        {/* Task markers */}
        {mapReady && validTaskEvents.map((taskEvent, index) => {
          // Title based on task action (con validación)
          const title = taskEvent.action === 'started' 
            ? `${t('taskStarted')}: ${taskEvent.title || ''}` 
            : taskEvent.action === 'completed'
            ? `${t('taskCompleted')}: ${taskEvent.title || ''}`
            : `${t('taskActivity')}: ${taskEvent.title || ''}`;
          
          return (
            <Marker
              key={`task-${index}-${taskEvent._id || Math.random().toString()}`}
              coordinate={{
                latitude: taskEvent.latitude,
                longitude: taskEvent.longitude,
              }}
              title={title}
              description={formatDate(taskEvent.timestamp)}
              pinColor={getTaskMarkerColor(taskEvent)}
            >
              {renderSafeCallout(
                title,
                taskEvent.message || '',
                formatDate(taskEvent.timestamp)
              )}
            </Marker>
          );
        })}
        
        {/* Current location marker */}
        {safeCurrentLocation && (
          <Marker
            coordinate={{
              latitude: safeCurrentLocation.latitude,
              longitude: safeCurrentLocation.longitude,
            }}
            title={t('yourLocation')}
            description={t('currentPosition')}
            pinColor={markerColors.current}
          >
            {renderSafeCallout(
              t('yourLocation'),
              t('currentPosition'),
              null
            )}
            <Circle
              center={{
                latitude: safeCurrentLocation.latitude,
                longitude: safeCurrentLocation.longitude,
              }}
              radius={50}
              fillColor="rgba(33, 150, 243, 0.2)"
              strokeColor="rgba(33, 150, 243, 0.5)"
            />
          </Marker>
        )}
      </MapView>
    );
  };

  // Return MapView for both iOS and Android
  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        renderIOSMap()
      ) : (
        // Android rendering
        <MapView
          style={styles.map}
          region={region}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          showsMyLocationButton={true}
          toolbarEnabled={true}
          showsCompass={true}
          onMapReady={() => setMapReady(true)}
          onError={handleMapError}
        >
          {mapReady && workSessions.map((session, sessionIndex) => (
            <React.Fragment key={`session-${sessionIndex}`}>
              {/* Session path line */}
              {session.points.length >= 2 && (
                <Polyline
                  coordinates={session.points.map(point => ({
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }))}
                  strokeColor={getSessionColor(sessionIndex)}
                  strokeWidth={4}
                />
              )}
              
              {/* Start marker */}
              {session.startLocation && (
                <Marker
                  coordinate={{
                    latitude: session.startLocation.latitude,
                    longitude: session.startLocation.longitude,
                  }}
                  title={t('workStarted')}
                  description={formatDate(session.startLocation.timestamp)}
                  pinColor={markerColors.start}
                >
                  {renderSafeCallout(
                    t('workStarted'), 
                    null, 
                    formatDate(session.startLocation.timestamp)
                  )}
                </Marker>
              )}
              
              {/* End marker */}
              {session.endLocation && (
                <Marker
                  coordinate={{
                    latitude: session.endLocation.latitude,
                    longitude: session.endLocation.longitude,
                  }}
                  title={t('workEnded')}
                  description={formatDate(session.endLocation.timestamp)}
                  pinColor={markerColors.end}
                >
                  {renderSafeCallout(
                    t('workEnded'),
                    `${t('duration')}: ${calculateDuration(session.startTime, session.endTime)}`,
                    formatDate(session.endLocation.timestamp)
                  )}
                </Marker>
              )}
            </React.Fragment>
          ))}
          
          {/* Task markers and current location marker - using the same code as in the original implementation */}
          {mapReady && taskEvents.map((taskEvent, index) => {
            // Get coordinates correctly
            const latitude = taskEvent.latitude || 0;
            const longitude = taskEvent.longitude || 0;
            
            if (!latitude || !longitude) return null;
            
            // Title based on task action
            const title = taskEvent.action === 'started' 
              ? `${t('taskStarted')}: ${taskEvent.title || ''}` 
              : taskEvent.action === 'completed'
              ? `${t('taskCompleted')}: ${taskEvent.title || ''}`
              : `${t('taskActivity')}: ${taskEvent.title || ''}`;
            
            return (
              <Marker
                key={`task-${index}-${taskEvent._id || ''}`}
                coordinate={{
                  latitude: latitude,
                  longitude: longitude,
                }}
                title={title}
                description={formatDate(taskEvent.timestamp)}
                pinColor={getTaskMarkerColor(taskEvent)}
              >
                {renderSafeCallout(
                  title,
                  taskEvent.message || '',
                  formatDate(taskEvent.timestamp)
                )}
              </Marker>
            );
          })}
          
          {/* Current location marker */}
          {currentLocation && currentLocation.latitude && currentLocation.longitude && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title={t('yourLocation')}
              description={t('currentPosition')}
              pinColor={markerColors.current}
            >
              {renderSafeCallout(
                t('yourLocation'),
                t('currentPosition'),
                null
              )}
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={50}
                fillColor="rgba(33, 150, 243, 0.2)"
                strokeColor="rgba(33, 150, 243, 0.5)"
              />
            </Marker>
          )}
        </MapView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 150, // Leave space for header
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  alternativeContainer: {
    padding: 15,
  },
  alternativeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  locationsList: {
    paddingBottom: 20,
  },
  locationItem: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  locationType: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  locationCoords: {
    color: '#666',
    marginBottom: 3,
  },
  locationTime: {
    color: '#888',
    fontSize: 12,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
  },
  calloutView: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    width: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 12,
    marginBottom: 5,
  },
  calloutTime: {
    fontSize: 10,
    color: '#666',
  },
});

export default MapComponent;
