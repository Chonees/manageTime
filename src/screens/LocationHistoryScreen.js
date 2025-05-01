import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
  Button,
  Platform,
  TextInput,
  Dimensions,
  Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocationTracking } from '../context/LocationTrackingContext';
import LanguageToggle from '../components/LanguageToggle';
import * as api from '../services/api';
import * as MapDiagnostics from '../services/map-diagnostic';
import { mapConfig } from '../services/platform-config';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout, Circle } from 'react-native-maps';

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (e) {
    return '';
  }
};

const formatShortDate = (date) => {
  if (!date) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const LocationHistoryView = ({ 
  viewMode, 
  locations, 
  currentLocation, 
  loading, 
  selectedUserName,
  onRefresh,
  refreshing
}) => {
  const { t } = useLanguage();
  
  // Process locations into sessions
  const processedSessions = React.useMemo(() => {
    try {
      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return [];
      }
      
      // Sort locations by timestamp
      const sortedLocations = [...locations].sort((a, b) => {
        const dateA = a && a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b && b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateA - dateB;
      });
      
      const sessions = [];
      let currentSession = { 
        points: [], 
        startLocation: null, 
        endLocation: null,
        startTime: null,
        endTime: null,
        distance: 0
      };
      
      // Group locations into sessions
      sortedLocations.forEach(location => {
        if (!location) return;
        
        // Extract coordinates
        const latitude = Number(location.latitude || (location.location?.coordinates?.[1] || 0));
        const longitude = Number(location.longitude || (location.location?.coordinates?.[0] || 0));
        
        // Skip invalid coordinates
        if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
          return;
        }
        
        const normalizedLocation = {
          ...location,
          latitude,
          longitude,
          timestamp: location.timestamp || new Date().toISOString()
        };
        
        // Process by type
        if (location.type === 'start') {
          // If we have an existing session with points, save it
          if (currentSession.points.length > 0) {
            sessions.push({...currentSession});
          }
          
          // Start a new session
          currentSession = { 
            points: [normalizedLocation], 
            startLocation: normalizedLocation,
            endLocation: null,
            startTime: normalizedLocation.timestamp,
            endTime: null,
            distance: 0
          };
        } 
        else if (location.type === 'end') {
          // Add end point to current session
          currentSession.points.push(normalizedLocation);
          currentSession.endLocation = normalizedLocation;
          currentSession.endTime = normalizedLocation.timestamp;
          
          // Calculate total distance
          if (currentSession.points.length >= 2) {
            let totalDistance = 0;
            for (let i = 1; i < currentSession.points.length; i++) {
              const prevPoint = currentSession.points[i-1];
              const currPoint = currentSession.points[i];
              
              // Simple distance calculation
              const latDiff = currPoint.latitude - prevPoint.latitude;
              const lngDiff = currPoint.longitude - prevPoint.longitude;
              const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // rough meters
              totalDistance += dist;
            }
            currentSession.distance = totalDistance;
          }
          
          // Save the session
          if (currentSession.startLocation) {
            sessions.push({...currentSession});
          }
          
          // Reset for next session
          currentSession = { 
            points: [], 
            startLocation: null, 
            endLocation: null,
            startTime: null,
            endTime: null,
            distance: 0
          };
        } 
        else if (location.type === 'tracking') {
          // Handle tracking points
          // If we don't have a session already, create one with this point as the start
          if (!currentSession.startLocation) {
            currentSession = {
              points: [normalizedLocation],
              startLocation: normalizedLocation,
              endLocation: null,
              startTime: normalizedLocation.timestamp,
              endTime: null,
              distance: 0
            };
          } else {
            // Add tracking point to current session
            currentSession.points.push(normalizedLocation);
            
            // Always update the end to the most recent tracking point
            currentSession.endLocation = normalizedLocation;
            currentSession.endTime = normalizedLocation.timestamp;
          }
        }
        else if (currentSession.startLocation) {
          // Add point to current session
          currentSession.points.push(normalizedLocation);
        }
      });
      
      // Add the last session if not empty
      if (currentSession.points.length > 0 && currentSession.startLocation) {
        sessions.push({...currentSession});
      }
      
      return sessions;
    } catch (err) {
      console.error("Error processing locations:", err);
      return [];
    }
  }, [locations]);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>{t('loadingLocations')}</Text>
      </View>
    );
  }
  
  // Helper function to format duration
  const formatDuration = (start, end) => {
    if (!start || !end) return '';
    
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const durationMs = endDate - startDate;
      
      if (isNaN(durationMs)) return '';
      
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      const remainingMinutes = minutes % 60;
      const remainingSeconds = seconds % 60;
      
      let result = '';
      if (hours > 0) {
        result += `${hours}h `;
      }
      if (remainingMinutes > 0 || hours > 0) {
        result += `${remainingMinutes}m `;
      }
      result += `${remainingSeconds}s`;
      
      return result;
    } catch (e) {
      console.error("Error formatting duration:", e);
      return '';
    }
  };
  
  // Render based on view mode
  if (viewMode === 'map') {
    return <PlatformMapView sessions={processedSessions} currentLocation={currentLocation} />;
  }
  
  // Render location history as a list
  return (
    <FlatList
      style={styles.listContainer}
      data={processedSessions}
      keyExtractor={(item, index) => `session-${index}`}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4A90E2']}
        />
      }
      ListEmptyComponent={() => (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>{t('noLocations')}</Text>
        </View>
      )}
      renderItem={({ item, index }) => (
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>{t('session')} {index + 1}</Text>
            <Text style={styles.sessionDate}>
              {formatDate(item.startTime)}
            </Text>
          </View>
          
          <View style={styles.sessionDetails}>
            {/* Start location */}
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={styles.startMarker} />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationTitle}>{t('sessionStart')}</Text>
                <Text style={styles.locationCoordinates}>
                  {item.startLocation.latitude.toFixed(6)}, {item.startLocation.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationTime}>
                  {formatDate(item.startLocation.timestamp)}
                </Text>
              </View>
            </View>
            
            {/* Points summary */}
            <View style={styles.pointsSummary}>
              <Text style={styles.pointsCount}>
                {item.points.length} {t('trackingPoints')}
              </Text>
              <Text style={styles.distanceText}>
                {(item.distance / 1000).toFixed(2)} km
              </Text>
            </View>
            
            {/* End location */}
            {item.endLocation && (
              <View style={styles.locationRow}>
                <View style={styles.locationIconContainer}>
                  <View style={styles.endMarker} />
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationTitle}>{t('sessionEnd')}</Text>
                  <Text style={styles.locationCoordinates}>
                    {item.endLocation.latitude.toFixed(6)}, {item.endLocation.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationTime}>
                    {formatDate(item.endLocation.timestamp)}
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Duration */}
          {item.startTime && item.endTime && (
            <View style={styles.durationContainer}>
              <Text style={styles.durationLabel}>{t('duration')}:</Text>
              <Text style={styles.durationValue}>
                {formatDuration(item.startTime, item.endTime)}
              </Text>
            </View>
          )}
          
          {/* User info if available */}
          {selectedUserName && (
            <View style={styles.userContainer}>
              <Text style={styles.userLabel}>{t('user')}:</Text>
              <Text style={styles.userName}>{selectedUserName}</Text>
            </View>
          )}
        </View>
      )}
    />
  );
};

// Platform-specific Map Component
const PlatformMapView = ({ sessions, currentLocation }) => {
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Set initial region based on data
  useEffect(() => {
    if (sessions.length > 0) {
      // Find a valid location to center the map
      for (const session of sessions) {
        if (session.startLocation) {
          setRegion({
            latitude: session.startLocation.latitude,
            longitude: session.startLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
          break;
        }
      }
    } else if (currentLocation) {
      setRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [sessions, currentLocation]);

  // Force map ready after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) {
        console.log("Forcing map ready state after timeout");
        setMapReady(true);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Safe callout renderer
  const renderSafeCallout = (title, description, time) => {
    const safeTitle = title || '';
    const safeDescription = description || '';
    const safeTime = time || '';
    
    return (
      <Callout tooltip>
        <View style={styles.calloutView}>
          {safeTitle !== '' && <Text style={styles.calloutTitle}>{safeTitle}</Text>}
          {safeDescription !== '' && <Text style={styles.calloutDescription}>{safeDescription}</Text>}
          {safeTime !== '' && <Text style={styles.calloutTime}>{safeTime}</Text>}
        </View>
      </Callout>
    );
  };

  // iOS-specific map implementation
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={null} // Changed from "apple" to null
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={true}
          showsPointsOfInterest={false}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Render iOS markers */}
          {sessions.map((session, sessionIndex) => {
            if (!session || !session.points || session.points.length === 0) return null;
            
            // For iOS, we'll use individual markers for better compatibility
            return (
              <React.Fragment key={`session-${sessionIndex}`}>
                {/* Start marker */}
                {session.startLocation && session.startLocation.latitude && session.startLocation.longitude && (
                  <Marker
                    coordinate={{
                      latitude: Number(session.startLocation.latitude),
                      longitude: Number(session.startLocation.longitude),
                    }}
                    title={t('sessionStart')}
                    description={formatDate(session.startLocation.timestamp)}
                  >
                    <View style={styles.startMarker} />
                  </Marker>
                )}
                
                {/* End marker */}
                {session.endLocation && session.endLocation.latitude && session.endLocation.longitude && (
                  <Marker
                    coordinate={{
                      latitude: Number(session.endLocation.latitude),
                      longitude: Number(session.endLocation.longitude),
                    }}
                    title={t('sessionEnd')}
                    description={formatDate(session.endLocation.timestamp)}
                  >
                    <View style={styles.endMarker} />
                  </Marker>
                )}
                
                {/* Path markers - show a subset of points to avoid clutter */}
                {session.points.map((point, pointIndex) => {
                  // Skip points with invalid coordinates
                  if (!point || !point.latitude || !point.longitude) return null;
                  
                  // Skip start and end points (already shown)
                  if (pointIndex === 0 || pointIndex === session.points.length - 1) return null;
                  
                  // Only show some points to avoid clutter
                  if (pointIndex % Math.max(Math.floor(session.points.length / 10), 1) !== 0) {
                    return null;
                  }
                  
                  return (
                    <Marker
                      key={`point-${sessionIndex}-${pointIndex}`}
                      coordinate={{
                        latitude: Number(point.latitude),
                        longitude: Number(point.longitude),
                      }}
                      anchor={{ x: 0.5, y: 0.5 }}
                      opacity={0.7}
                    >
                      <View style={styles.pathMarker} />
                    </Marker>
                  );
                })}
              </React.Fragment>
            );
          })}
          
          {/* Current location marker */}
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title={t('currentLocation')}
            >
              <View style={styles.currentLocationMarker} />
            </Marker>
          )}
        </MapView>
      </View>
    );
  }
  
  // Android map implementation
  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* Render Android polylines and markers */}
        {sessions.map((session, index) => {
          if (!session || !session.points || session.points.length < 2) return null;
          
          return (
            <React.Fragment key={`session-${index}`}>
              {/* Polyline for the session */}
              <Polyline
                coordinates={session.points}
                strokeWidth={4}
                strokeColor={['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][index % 5]}
                lineCap="round"
                lineJoin="round"
              />
              
              {/* Start marker */}
              {session.startLocation && (
                <Marker
                  coordinate={{
                    latitude: session.startLocation.latitude,
                    longitude: session.startLocation.longitude,
                  }}
                  title={t('sessionStart')}
                  description={formatDate(session.startLocation.timestamp)}
                >
                  {renderSafeCallout(
                    t('sessionStart'),
                    '',
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
                  title={t('sessionEnd')}
                  description={formatDate(session.endLocation.timestamp)}
                >
                  {renderSafeCallout(
                    t('sessionEnd'),
                    '',
                    formatDate(session.endLocation.timestamp)
                  )}
                </Marker>
              )}
            </React.Fragment>
          );
        })}
        
        {/* Current location marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title={t('currentLocation')}
            description={t('currentPosition')}
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

const LocationHistoryScreen = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { tracking, locations: trackedLocations, startTracking, stopTracking } = useLocationTracking();
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState(null);
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [dateFilter, setDateFilter] = useState(null);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Estado para el selector de fecha personalizado
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  // Referencia para el intervalo de actualización automática
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(user?.isAdmin || false);

  // Cargar historial de ubicaciones
  const loadLocationHistory = useCallback(async (userId = null) => {
    setLoading(true);
    setError(null);

    try {
      // Get location history with task data
      const history = await api.getLocationHistoryWithTasks(userId);
      console.log(`Cargadas ${history.length} ubicaciones y actividades de tareas`);
      setLocationHistory(history);
      
      // Si hay un filtro de fecha activo, aplicarlo inmediatamente
      if (dateFilter) {
        applyDateFilter(history, dateFilter);
      } else {
        setFilteredLocations(history);
      }
    } catch (error) {
      console.error('Error al cargar el historial de ubicaciones:', error);
      // Fallback to regular location history if the task history endpoint fails
      try {
        const regularHistory = await api.getLocationHistory(userId);
        console.log(`Fallback: Cargadas ${regularHistory.length} ubicaciones regulares`);
        setLocationHistory(regularHistory);
        
        if (dateFilter) {
          applyDateFilter(regularHistory, dateFilter);
        } else {
          setFilteredLocations(regularHistory);
        }
      } catch (fallbackError) {
        setError(fallbackError.message || 'Error al cargar el historial de ubicaciones');
        Alert.alert('Error', fallbackError.message || 'Error al cargar el historial de ubicaciones');
      }
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  // Cargar lista de usuarios (solo para administradores)
  const loadUsers = useCallback(async () => {
    if (!user?.isAdmin) return;
    
    try {
      const usersList = await api.getUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  }, [user]);

  // Configurar actualización automática para administradores
  useEffect(() => {
    let intervalId = null;
    
    if (user?.isAdmin && autoRefreshEnabled) {
      // Actualizar cada 30 segundos para administradores
      intervalId = setInterval(() => {
        console.log('Actualizando automáticamente datos para administrador...');
        loadLocationHistory(selectedUserId);
        loadUsers();
      }, 30000); // 30 segundos
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user, autoRefreshEnabled, selectedUserId, loadLocationHistory, loadUsers]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadLocationHistory();
    if (user?.isAdmin) {
      loadUsers();
    }
    
    // Inicializar los valores del selector de fecha con la fecha actual
    const today = new Date();
    setSelectedDay(today.getDate().toString().padStart(2, '0'));
    setSelectedMonth((today.getMonth() + 1).toString().padStart(2, '0'));
    setSelectedYear(today.getFullYear().toString());
  }, [user, loadLocationHistory, loadUsers]);

  // Manejar la actualización de ubicación actual
  const handleLocationChange = (location) => {
    if (location && location.coords) {
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    }
  };

  // Función para refrescar los datos
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLocationHistory(selectedUserId);
      if (user?.isAdmin) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error al refrescar datos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Función para aplicar filtro de fecha
  const applyDateFilter = (locations, date) => {
    if (!date) {
      setFilteredLocations(locations);
      return;
    }

    // Crear fecha de inicio y fin del día seleccionado
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Filtrando por fecha: ${startDate.toISOString()} hasta ${endDate.toISOString()}`);
    
    // Filtrar ubicaciones que estén dentro del rango de fecha
    const filtered = locations.filter(location => {
      if (!location.timestamp) return false;
      
      const locationDate = new Date(location.timestamp);
      return locationDate >= startDate && locationDate <= endDate;
    });
    
    console.log(`Ubicaciones filtradas: ${filtered.length} de ${locations.length}`);
    setFilteredLocations(filtered);
  };

  // Aplicar la fecha seleccionada en el selector personalizado
  const applyCustomDateFilter = () => {
    // Validar que los valores ingresados sean números válidos
    const day = parseInt(selectedDay, 10);
    const month = parseInt(selectedMonth, 10) - 1; // Los meses en JS son 0-11
    const year = parseInt(selectedYear, 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year) || 
        day < 1 || day > 31 || month < 0 || month > 11 || year < 2000 || year > 2100) {
      Alert.alert('Error', 'Por favor ingresa una fecha válida');
      return;
    }
    
    // Crear objeto Date con los valores seleccionados
    const selectedDate = new Date(year, month, day);
    
    // Verificar que la fecha sea válida
    if (selectedDate.getDate() !== day) {
      Alert.alert('Error', 'La fecha ingresada no es válida');
      return;
    }
    
    console.log(`Fecha seleccionada: ${selectedDate.toISOString()}`);
    setDateFilter(selectedDate);
    applyDateFilter(locationHistory, selectedDate);
    setShowCalendar(false);
  };

  // Limpiar filtro de fecha
  const clearDateFilter = () => {
    setDateFilter(null);
    setFilteredLocations(locationHistory);
  };

  // Renderizar selector de usuarios (solo para administradores)
  const renderUserSelector = () => {
    if (!user?.isAdmin) return null;
    
    return (
      <View style={styles.userSelectorContainer}>
        <Text style={styles.selectorLabel}>{t('selectUser')}:</Text>
        <FlatList
          data={users}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item && item._id ? item._id.toString() : `user-${Math.random()}`}
          renderItem={({ item }) => {
            if (!item) return null;
            
            return (
              <TouchableOpacity
                style={[
                  styles.userItem,
                  selectedUserId === item._id && styles.selectedUserItem
                ]}
                onPress={() => {
                  setSelectedUserId(item._id);
                  setSelectedUserName(item.username);
                  loadLocationHistory(item._id);
                }}
              >
                <Text style={styles.userName}>{item.username}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  // Renderizar selector de fecha personalizado
  const renderCalendar = () => {
    // Generate calendar days for the current month/year
    const generateCalendarDays = () => {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth) - 1; // JavaScript months are 0-indexed
      
      if (isNaN(year) || isNaN(month)) return [];
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      
      // Create array for calendar grid
      const calendarDays = [];
      
      // Add empty cells for days before the 1st of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push({ day: '', empty: true });
      }
      
      // Add days of the month
      for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ day: i, empty: false });
      }
      
      return calendarDays;
    };
    
    // Get days for current month/year
    const calendarDays = generateCalendarDays();
    
    // Handle month navigation
    const goToPreviousMonth = () => {
      let newMonth = parseInt(selectedMonth) - 1;
      let newYear = parseInt(selectedYear);
      
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
      
      setSelectedMonth(newMonth.toString().padStart(2, '0'));
      setSelectedYear(newYear.toString());
    };
    
    const goToNextMonth = () => {
      let newMonth = parseInt(selectedMonth) + 1;
      let newYear = parseInt(selectedYear);
      
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
      
      setSelectedMonth(newMonth.toString().padStart(2, '0'));
      setSelectedYear(newYear.toString());
    };
    
    // Handle day selection
    const selectDay = (day) => {
      if (day.empty) return;
      
      setSelectedDay(day.day.toString().padStart(2, '0'));
      
      // Create date object and apply filter
      const newDate = new Date(
        parseInt(selectedYear),
        parseInt(selectedMonth) - 1,
        day.day
      );
      
      setSelectedDate(newDate);
      setDateFilter(newDate);
      applyDateFilter(locationHistory, newDate);
      setShowCalendar(false);
    };
    
    // Get month name
    const getMonthName = (monthNum) => {
      const months = [
        t('january'), t('february'), t('march'), t('april'), 
        t('may'), t('june'), t('july'), t('august'), 
        t('september'), t('october'), t('november'), t('december')
      ];
      return months[parseInt(monthNum) - 1] || '';
    };
    
    return (
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContent}>
            <Text style={styles.modalTitle}>{t('selectDate')}</Text>
            
            {/* Month/Year Navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={goToPreviousMonth}>
                <Ionicons name="chevron-back" size={24} color="#4A90E2" />
              </TouchableOpacity>
              
              <Text style={styles.calendarMonthYear}>
                {getMonthName(selectedMonth)} {selectedYear}
              </Text>
              
              <TouchableOpacity onPress={goToNextMonth}>
                <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
              </TouchableOpacity>
            </View>
            
            {/* Weekday Headers */}
            <View style={styles.calendarWeekdays}>
              {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map((day, index) => (
                <Text key={index} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>
            
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    day.empty && styles.emptyDay,
                    day.day === parseInt(selectedDay) && styles.selectedDay
                  ]}
                  onPress={() => selectDay(day)}
                  disabled={day.empty}
                >
                  <Text 
                    style={[
                      styles.calendarDayText,
                      day.day === parseInt(selectedDay) && styles.selectedDayText
                    ]}
                  >
                    {day.day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCalendar(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const today = new Date();
                  setSelectedDay(today.getDate().toString().padStart(2, '0'));
                  setSelectedMonth((today.getMonth() + 1).toString().padStart(2, '0'));
                  setSelectedYear(today.getFullYear().toString());
                  setSelectedDate(today);
                  setDateFilter(today);
                  applyDateFilter(locationHistory, today);
                  setShowCalendar(false);
                }}
              >
                <Text style={styles.todayButtonText}>{t('today')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar filtro de fecha
  const renderDateFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={styles.dateFilterButton}
        onPress={() => setShowCalendar(true)}
      >
        <Text style={styles.dateFilterButtonText}>
          {dateFilter ? formatShortDate(dateFilter) : t('selectDate')}
        </Text>
      </TouchableOpacity>
      
      {dateFilter && (
        <TouchableOpacity
          style={styles.clearFilterButton}
          onPress={clearDateFilter}
        >
          <Text style={styles.clearFilterText}>{t('clearFilter')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Manejar el inicio de seguimiento de ubicación
  const handleStartTracking = async () => {
    try {
      await startTracking();
      Alert.alert('Éxito', 'Seguimiento de ubicación iniciado');
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el seguimiento de ubicación: ' + error.message);
    }
  };

  // Manejar la detención de seguimiento de ubicación
  const handleStopTracking = async () => {
    try {
      stopTracking();
      
      // Si hay ubicaciones registradas, guardarlas en el backend
      if (trackedLocations.length > 0) {
        try {
          // Convertir las ubicaciones al formato esperado por el backend
          const locationData = trackedLocations.map(loc => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            timestamp: new Date().toISOString(),
            type: 'tracking' // o el tipo que corresponda en tu sistema
          }));
          
          // Enviar las ubicaciones al backend
          await api.saveLocations(locationData);
          Alert.alert('Éxito', `${trackedLocations.length} ubicaciones guardadas correctamente`);
          
          // Refrescar el historial después de guardar
          loadLocationHistory(selectedUserId);
        } catch (saveError) {
          console.error('Error al guardar ubicaciones:', saveError);
          Alert.alert('Error', 'Las ubicaciones se registraron pero no se pudieron guardar: ' + saveError.message);
        }
      } else {
        Alert.alert('Información', 'Seguimiento de ubicación detenido. No se registraron ubicaciones.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo detener el seguimiento de ubicación: ' + error.message);
    }
  };

  // Renderizar el control de seguimiento de ubicación
  const renderTrackingControls = () => (
    <View style={styles.trackingControlsContainer}>
      <Text style={styles.trackingStatusText}>
        {tracking ? t('trackingActive') : t('trackingInactive')}
      </Text>
      
      {tracking ? (
        <TouchableOpacity
          style={[styles.trackingButton, styles.stopTrackingButton]}
          onPress={handleStopTracking}
        >
          <Ionicons name="stop-circle" size={22} color="#fff" style={styles.trackingButtonIcon} />
          <Text style={styles.trackingButtonText}>{t('stopTracking')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.trackingButton, styles.startTrackingButton]}
          onPress={handleStartTracking}
        >
          <Ionicons name="play-circle" size={22} color="#fff" style={styles.trackingButtonIcon} />
          <Text style={styles.trackingButtonText}>{t('startTracking')}</Text>
        </TouchableOpacity>
      )}
      
      {tracking && trackedLocations.length > 0 && (
        <Text style={styles.locationCountText}>
          {trackedLocations.length} {t('locationsRecorded')}
        </Text>
      )}
    </View>
  );

  // Determinar qué ubicaciones mostrar (filtradas o todas)
  const locationsToDisplay = dateFilter ? filteredLocations : locationHistory;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('locationHistory')}</Text>
      </View>

      {renderTrackingControls()}

      <View style={styles.controls}>
        {renderDateFilter()}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}>
              <Ionicons name="map-outline" size={14} color={viewMode === 'map' ? '#fff' : '#1976D2'} /> {t('mapView')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>
              <Ionicons name="list-outline" size={14} color={viewMode === 'list' ? '#fff' : '#1976D2'} /> {t('listView')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderUserSelector()}
      {renderCalendar()}

      <LocationHistoryView
        viewMode={viewMode}
        locations={locationsToDisplay}
        currentLocation={currentLocation}
        loading={loading}
        selectedUserName={selectedUserName}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userSelectorContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  userItem: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  selectedUserItem: {
    backgroundColor: '#4A90E2',
  },
  userName: {
    color: '#333',
  },
  dateFilterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 5,
  },
  clearFilterButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activeDateFilter: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 10,
    alignSelf: 'stretch',
  },
  dateFilterText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sessionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  sessionDetails: {
    marginVertical: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  locationIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
    paddingTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  locationCoordinates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  locationTime: {
    fontSize: 12,
    color: '#888',
  },
  pointsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginVertical: 8,
  },
  pointsCount: {
    fontSize: 14,
    color: '#666',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  durationLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  startMarker: {
    backgroundColor: '#4CAF50',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'white',
  },
  endMarker: {
    backgroundColor: '#F44336',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'white',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  userLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateFilterButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  dateFilterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  clearFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  trackingControlsContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  trackingStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  trackingButton: {
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTrackingButton: {
    backgroundColor: '#4CAF50',
  },
  stopTrackingButton: {
    backgroundColor: '#F44336',
  },
  trackingButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  trackingButtonIcon: {
    marginRight: 10,
  },
  locationCountText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  dateInputGroup: {
    alignItems: 'center',
    width: '30%',
  },
  dateInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  applyButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
  },
  map: {
    width: '100%',
    height: '100%',
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
  pathMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#E3F2FD',
  },
  activeToggle: {
    backgroundColor: '#4A90E2',
  },
  toggleText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  activeToggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  controls: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  calendarContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 350,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  weekdayText: {
    fontSize: 14,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#333',
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  selectedDay: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LocationHistoryScreen;
