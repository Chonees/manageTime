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

  // Return MapView for both iOS and Android
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
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
                <Callout>
                  <View style={styles.calloutView}>
                    <Text style={styles.calloutTitle}>{t('workStarted')}</Text>
                    <Text style={styles.calloutTime}>
                      {formatDate(session.startLocation.timestamp)}
                    </Text>
                  </View>
                </Callout>
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
                <Callout>
                  <View style={styles.calloutView}>
                    <Text style={styles.calloutTitle}>{t('workEnded')}</Text>
                    <Text style={styles.calloutDescription}>
                      {t('duration')}: {calculateDuration(session.startTime, session.endTime)}
                    </Text>
                    <Text style={styles.calloutTime}>
                      {formatDate(session.endLocation.timestamp)}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            )}
          </React.Fragment>
        ))}
        
        {/* Task markers */}
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
              <Callout tooltip>
                <View style={styles.calloutView}>
                  <Text style={styles.calloutTitle}>{title}</Text>
                  <Text style={styles.calloutDescription}>
                    {taskEvent.message || ''}
                  </Text>
                  <Text style={styles.calloutTime}>
                    {formatDate(taskEvent.timestamp)}
                  </Text>
                </View>
              </Callout>
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
