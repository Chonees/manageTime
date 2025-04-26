import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout, Circle } from 'react-native-maps';
import { useLanguage } from '../context/LanguageContext';
import { mapConfig } from '../services/platform-config';

// Completely rewritten MapComponent with iOS compatibility fixes
const MapComponent = ({ 
  locations, 
  currentLocation, 
  isLoading, 
  selectedUserName,
  onError
}) => {
  const { t } = useLanguage();
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [sessions, setSessions] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);

  // Validate coordinates to prevent errors
  const validateCoordinates = (coords) => {
    if (!coords) return false;
    const lat = coords.latitude || coords.coords?.latitude;
    const lng = coords.longitude || coords.coords?.longitude;
    return (
      typeof lat === 'number' && 
      !isNaN(lat) && 
      typeof lng === 'number' && 
      !isNaN(lng)
    );
  };

  // Safe render callout - ensures all values are valid
  const renderSafeCallout = (title, description, time) => {
    const safeTitle = (title && typeof title === 'string') ? title : '';
    const safeDescription = (description && typeof description === 'string') ? description : '';
    const safeTime = (time && typeof time === 'string') ? time : '';
    return (
      <Callout tooltip>
        <View style={styles.calloutView}>
          <Text style={styles.calloutTitle}>{safeTitle}</Text>
          {safeDescription !== '' && <Text style={styles.calloutDescription}>{safeDescription}</Text>}
          {safeTime !== '' && <Text style={styles.calloutTime}>{safeTime}</Text>}
        </View>
      </Callout>
    );
  };

  // Process locations into sessions
  useEffect(() => {
    try {
      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        setSessions([]);
        return;
      }

      // Sort locations by timestamp
      const sortedLocations = [...locations].sort((a, b) => {
        const dateA = a && a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b && b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateA - dateB;
      });

      const processedSessions = [];
      let currentSession = { points: [], startLocation: null, endLocation: null };

      // Group locations into sessions
      sortedLocations.forEach(location => {
        if (!location) return;

        // Extract coordinates from location object
        const latitude = location.latitude || 
          (location.location && location.location.coordinates ? 
            location.location.coordinates[1] : null);
            
        const longitude = location.longitude || 
          (location.location && location.location.coordinates ? 
            location.location.coordinates[0] : null);
            
        // Skip invalid coordinates
        if (typeof latitude !== 'number' || isNaN(latitude) || 
            typeof longitude !== 'number' || isNaN(longitude)) {
          return;
        }

        // Normalize location format
        const normalizedLocation = {
          ...location,
          latitude: Number(latitude),
          longitude: Number(longitude),
          timestamp: location.timestamp || new Date().toISOString()
        };

        // Process by type
        if (location.type === 'start') {
          if (currentSession.points.length > 0) {
            processedSessions.push({...currentSession});
            currentSession = { points: [], startLocation: null, endLocation: null };
          }
          currentSession.startLocation = normalizedLocation;
          currentSession.points.push(normalizedLocation);
        } 
        else if (location.type === 'end') {
          currentSession.endLocation = normalizedLocation;
          currentSession.points.push(normalizedLocation);
          
          if (currentSession.startLocation) {
            processedSessions.push({...currentSession});
            currentSession = { points: [], startLocation: null, endLocation: null };
          }
        } 
        else {
          if (currentSession.startLocation) {
            currentSession.points.push(normalizedLocation);
          }
        }
      });

      // Add the last session if not empty
      if (currentSession.points.length > 0 && currentSession.startLocation) {
        processedSessions.push({...currentSession});
      }

      setSessions(processedSessions);
    } catch (error) {
      console.error('Error processing locations:', error);
      setMapError('Error processing locations');
      if (onError) onError(error);
    }
  }, [locations]);

  // Set initial region based on locations or current location
  useEffect(() => {
    if (currentLocation && validateCoordinates(currentLocation)) {
      setRegion({
        latitude: Number(currentLocation.latitude),
        longitude: Number(currentLocation.longitude),
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      return;
    }
    
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      if (lastSession.points.length > 0) {
        const lastPoint = lastSession.points[lastSession.points.length - 1];
        setRegion({
          latitude: Number(lastPoint.latitude),
          longitude: Number(lastPoint.longitude),
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    }
  }, [currentLocation, sessions]);

  // Force map ready after timeout
  useEffect(() => {
    // Set a timeout to force map ready state after 2 seconds
    const timer = setTimeout(() => {
      if (!mapReady) {
        console.log("Forcing map ready state after timeout");
        setMapReady(true);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle map errors
  const handleMapError = (error) => {
    console.error("Map error:", error);
    setMapError(error?.message || 'Unknown map error');
    if (onError) onError(error);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>{t('loadingMap')}</Text>
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{t('mapError')}</Text>
        <Text style={styles.errorText}>{mapError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setMapError(null)}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render different map components based on platform
  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        // iOS-specific map implementation
        <MapView
          ref={mapRef}
          style={styles.map}
          provider="apple"
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
          onError={handleMapError}
          showsUserLocation={true}
          showsMyLocationButton={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Render iOS markers only */}
          {sessions.map((session, sessionIndex) => {
            if (!session.points || session.points.length === 0) return null;
            
            return session.points.map((point, pointIndex) => {
              // Skip invalid points
              if (!point || !point.latitude || !point.longitude) return null;
              
              // Determine marker style
              let markerColor = '#2196F3'; // Default blue
              let markerSize = 5;
              let showLabel = false;
              
              // Special styling for start/end points
              if (pointIndex === 0) {
                markerColor = '#4CAF50'; // Green for start
                markerSize = 10;
                showLabel = true;
              } else if (pointIndex === session.points.length - 1) {
                markerColor = '#F44336'; // Red for end
                markerSize = 10;
                showLabel = true;
              } else {
                // Only show some points to avoid clutter
                if (pointIndex % Math.max(Math.floor(session.points.length / 10), 1) !== 0) {
                  return null; // Skip this point
                }
              }
              
              return (
                <Marker
                  key={`point-${sessionIndex}-${pointIndex}`}
                  coordinate={{
                    latitude: Number(point.latitude),
                    longitude: Number(point.longitude)
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[
                    styles.customMarker, 
                    { 
                      backgroundColor: markerColor,
                      width: markerSize * 2,
                      height: markerSize * 2,
                      borderRadius: markerSize
                    }
                  ]} />
                  
                  {showLabel && (
                    <Callout>
                      <View style={styles.calloutView}>
                        <Text style={styles.calloutTitle}>
                          {pointIndex === 0 ? t('sessionStart') : t('sessionEnd')}
                        </Text>
                        <Text style={styles.calloutTime}>
                          {point.timestamp}
                        </Text>
                      </View>
                    </Callout>
                  )}
                </Marker>
              );
            }).filter(Boolean); // Filter out null values
          })}
          
          {/* Current location marker */}
          {currentLocation && validateCoordinates(currentLocation) && (
            <Marker
              coordinate={{
                latitude: Number(currentLocation.latitude),
                longitude: Number(currentLocation.longitude),
              }}
            >
              <View style={styles.currentLocationMarker} />
            </Marker>
          )}
        </MapView>
      ) : (
        // Android map implementation
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
          onError={handleMapError}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Render sessions with polylines for Android */}
          {sessions.map((session, index) => {
            // Skip sessions with insufficient points
            if (!session.points || session.points.length < 2) {
              return null;
            }
            
            // Ensure all coordinates are valid numbers
            const validPoints = session.points.map(point => ({
              latitude: Number(point.latitude),
              longitude: Number(point.longitude)
            }));
            
            return (
              <React.Fragment key={`session-${index}`}>
                {/* Polyline for the session */}
                <Polyline
                  coordinates={validPoints}
                  strokeWidth={4}
                  strokeColor={['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][index % 5]}
                  lineCap="round"
                  lineJoin="round"
                />
                
                {/* Start marker */}
                {session.startLocation && (
                  <Marker
                    coordinate={{
                      latitude: Number(session.startLocation.latitude),
                      longitude: Number(session.startLocation.longitude),
                    }}
                    title={t('sessionStart')}
                    description={session.startLocation.timestamp}
                  >
                    {renderSafeCallout(
                      t('sessionStart'),
                      selectedUserName ? `${t('user')}: ${selectedUserName}` : '',
                      session.startLocation.timestamp
                    )}
                  </Marker>
                )}
                
                {/* End marker */}
                {session.endLocation && (
                  <Marker
                    coordinate={{
                      latitude: Number(session.endLocation.latitude),
                      longitude: Number(session.endLocation.longitude),
                    }}
                    title={t('sessionEnd')}
                    description={session.endLocation.timestamp}
                  >
                    {renderSafeCallout(
                      t('sessionEnd'),
                      '',
                      session.endLocation.timestamp
                    )}
                  </Marker>
                )}
              </React.Fragment>
            );
          })}
          
          {/* Current location marker */}
          {currentLocation && validateCoordinates(currentLocation) && (
            <Marker
              coordinate={{
                latitude: Number(currentLocation.latitude),
                longitude: Number(currentLocation.longitude),
              }}
              title={t('currentLocation')}
              description={t('currentPosition')}
            >
              {renderSafeCallout(
                t('currentLocation'),
                t('currentPosition'),
                ''
              )}
              <Circle
                center={{
                  latitude: Number(currentLocation.latitude),
                  longitude: Number(currentLocation.longitude),
                }}
                radius={50}
                fillColor="rgba(33, 150, 243, 0.2)"
                strokeColor="rgba(33, 150, 243, 0.5)"
              />
            </Marker>
          )}
        </MapView>
      )}
      
      {/* Debug button */}
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={() => {
          Alert.alert(
            "Map Debug Info", 
            `Map Ready: ${mapReady ? 'Yes' : 'No'}\nSessions: ${sessions.length}\nProvider: ${Platform.OS === 'android' ? 'Google' : 'Apple'}\nPoints: ${sessions.reduce((acc, session) => acc + (session.points?.length || 0), 0)}`
          );
        }}
      >
        <Text style={styles.debugButtonText}>Debug</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calloutView: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 12,
    marginBottom: 3,
  },
  calloutTime: {
    fontSize: 10,
    color: '#666',
  },
  customMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
    borderWidth: 1,
    borderColor: 'white',
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(75, 0, 130, 0.7)',
    borderWidth: 2,
    borderColor: 'white',
  },
  debugButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
  },
});

export default MapComponent;
