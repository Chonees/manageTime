import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Platform,
  StatusBar,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import * as api from '../../services/api';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const theme = useTheme();
  const [stats, setStats] = useState({
    users: { total: 0 },
    tasks: { total: 0, completed: 0, pending: 0, completionRate: 0 },
    locations: { total: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]); // Añadir estado para actividades recientes
  const [realTimeLocations, setRealTimeLocations] = useState([]); // Añadir estado para ubicaciones en tiempo real
  const [loadingLocations, setLoadingLocations] = useState(false); // Estado para carga de ubicaciones
  const [mapReady, setMapReady] = useState(false); // Estado para controlar si el mapa está listo
  const mapRef = useRef(null); // Referencia al componente de mapa

  // Load statistics and recent activities
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load admin stats
      const statsData = await api.getAdminStats();
      setStats(statsData);

      // Load recent activities
      const activityData = await api.getRecentActivities();
      setRecentActivity(activityData);

      // Cargar ubicaciones en tiempo real
      await loadRealTimeLocations();
    } catch (error) {
      console.error('Error loading stats:', error);
      setError(error.message || t('errorLoadingStats'));
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar ubicaciones en tiempo real sin bloquear la UI
  const loadRealTimeLocations = async (silent = false) => {
    if (!user?.isAdmin) return;
    
    try {
      if (!silent) setLoadingLocations(true);
      let locations = [];
      
      try {
        // Intentar obtener ubicaciones del nuevo endpoint
        locations = await api.getRealTimeLocations();
        console.log('Ubicaciones en tiempo real cargadas:', locations.length);
      } catch (error) {
        console.error('Error al cargar ubicaciones en tiempo real:', error);
        
        // Plan B: Obtener ubicaciones recientes del historial
        try {
          console.log('Intentando cargar ubicaciones del historial como respaldo...');
          // Obtener la lista de usuarios
          const usersList = await api.getUsers();
          
          // Para cada usuario, obtener su ubicación más reciente
          const recentLocations = [];
          for (const user of usersList) {
            if (user.isActive) {
              // Obtener historial de ubicaciones de este usuario
              const history = await api.getLocationHistory(user._id);
              
              // Si hay historial, usar la ubicación más reciente
              if (history && history.length > 0) {
                const mostRecent = history[0]; // El historial suele venir ordenado por fecha
                recentLocations.push({
                  userId: user._id,
                  username: user.username,
                  latitude: mostRecent.latitude,
                  longitude: mostRecent.longitude,
                  timestamp: mostRecent.timestamp,
                  type: mostRecent.type || 'unknown'
                });
              }
            }
          }
          
          locations = recentLocations;
          console.log('Ubicaciones cargadas desde historial como respaldo:', locations.length);
        } catch (fallbackError) {
          console.error('Error al cargar ubicaciones de respaldo:', fallbackError);
        }
      }
      
      // Actualizar el estado con las nuevas ubicaciones
      setRealTimeLocations(prevLocations => {
        // Solo actualizar si hay cambios en las ubicaciones
        if (JSON.stringify(prevLocations) !== JSON.stringify(locations)) {
          return locations;
        }
        return prevLocations;
      });
    } catch (error) {
      console.error('Error general al cargar ubicaciones:', error);
    } finally {
      if (!silent) setLoadingLocations(false);
    }
  };

  // Configurar actualización silenciosa y frecuente de ubicaciones en tiempo real
  useEffect(() => {
    let locationInterval = null;
    
    if (user?.isAdmin && mapReady) {
      // Actualizar cada 5 segundos de forma silenciosa (sin indicadores de carga)
      locationInterval = setInterval(() => {
        loadRealTimeLocations(true); // true = modo silencioso
      }, 5000);
    }
    
    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [user, mapReady]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert(t('error'), t('error'));
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const locationTime = new Date(timestamp);
    const diffMs = now - locationTime;
    
    // Convertir a segundos, minutos, horas
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} ${diffDays === 1 ? t('day') : t('days')} ${t('ago')}`;
    } 
    if (diffHours > 0) {
      return `${diffHours} ${diffHours === 1 ? t('hour') : t('hours')} ${t('ago')}`;
    } 
    if (diffMins > 0) {
      return `${diffMins} ${diffMins === 1 ? t('minute') : t('minutes')} ${t('ago')}`;
    }
    
    return `${diffSecs} ${diffSecs === 1 ? t('second') : t('seconds')} ${t('ago')}`;
  };

  const renderActivityItem = ({ item }) => {
    let activityColor = '#4A90E2';
    let activityText = '';

    if (item.type === 'task') {
      switch (item.action) {
        case 'created':
          activityColor = '#2ecc71';
          activityText = t('taskCreated', { task: item.title });
          break;
        case 'completed':
          activityColor = '#27ae60';
          activityText = t('taskCompleted', { task: item.title });
          break;
        case 'deleted':
          activityColor = '#e74c3c';
          activityText = t('taskDeleted', { task: item.title });
          break;
        case 'updated':
          activityColor = '#f39c12';
          activityText = t('taskUpdated', { task: item.title });
          break;
      }
    } else if (item.type === 'location') {
      switch (item.action) {
        case 'started_working':
          activityColor = '#2ecc71';
          activityText = t('startedWorkingAt', { location: item.title });
          break;
        case 'entered_location':
          activityColor = '#3498db';
          activityText = t('enteredLocation', { location: item.title });
          break;
        case 'stopped_working':
          activityColor = '#e74c3c';
          activityText = t('stoppedWorkingAt', { location: item.title });
          break;
        case 'exited_location':
          activityColor = '#f39c12';
          activityText = t('exitedLocation', { location: item.title });
          break;
      }
    }

    return (
      <View style={styles.activityItem}>
        <View style={[styles.activityDot, { backgroundColor: activityColor }]} />
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            {item.username} {activityText}
          </Text>
          <Text style={styles.activityTime}>
            {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  // Función para validar coordenadas
  const parseSafeLocation = (location) => {
    if (!location) return null;
    
    // Validar que las coordenadas existan y sean números válidos
    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn('Coordenadas inválidas:', location);
      return null;
    }
    
    // Validar que las coordenadas estén en rangos válidos
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.warn('Coordenadas fuera de rango:', { latitude, longitude });
      return null;
    }
    
    return {
      ...location,
      latitude,
      longitude
    };
  };

  // Función para renderizar de forma segura los marcadores
  const renderSafeMarker = (location, index) => {
    const safeLocation = parseSafeLocation(location);
    if (!safeLocation) return null;
    
    return (
      <Marker
        key={`user-location-${location.userId}-${index}`}
        coordinate={{
          latitude: safeLocation.latitude,
          longitude: safeLocation.longitude,
        }}
        title={location.username || `Usuario ${index + 1}`}
        description={`Última actualización: ${new Date(location.timestamp).toLocaleString()}`}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.colors.darkGrey} barStyle="light-content" />
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.lightCream]}
            tintColor={theme.colors.lightCream}
          />
        }
      >
        <View style={styles.header}>
          <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>{t('adminDashboard')}</Text>
            <Text style={styles.headerSubtitle}>{t('Welcome')}, {user?.username || 'Admin'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>{t('logOut')}</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{t('statistics')}</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.users.total}</Text>
                <Text style={styles.statLabel}>{t('totalUsers')}</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.users.active}</Text>
                <Text style={styles.statLabel}>{t('activeUsers')}</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.tasks.total}</Text>
                <Text style={styles.statLabel}>{t('totalTasks')}</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.tasks.completed}</Text>
                <Text style={styles.statLabel}>{t('completedTasks')}</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.tasks.pending}</Text>
                <Text style={styles.statLabel}>{t('pendingTasks')}</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.tasks.completionRate}%</Text>
                <Text style={styles.statLabel}>{t('completionRate')}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('UserManagement')}
            >
              <Text style={styles.actionButtonText}>{t('userManagement')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('TaskScreen')}
            >
              <Text style={styles.actionButtonText}>{t('taskManagement')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#fff3e5', borderColor: 'rgba(0, 0, 0, 0.1)' }]}
              onPress={() => navigation.navigate('AdminActivities')}
            >
              <Text style={[styles.actionButtonText, { color: '#000' }]}>{t('viewAllActivities')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de Ubicaciones en Tiempo Real */}
        <View style={styles.realTimeLocationsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: '#333333', marginBottom: 0, marginHorizontal: 0, marginTop: 0 }]}>{language === 'es' ? 'Ubicación en Tiempo Real de Usuarios' : 'Real Time Location Of Users'}</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => loadRealTimeLocations(false)}
            >
              <Ionicons name="refresh" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          
          {loadingLocations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>{t('loadingLocations')}</Text>
            </View>
          ) : realTimeLocations.length > 0 ? (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: realTimeLocations[0]?.latitude || -34.603722,
                  longitude: realTimeLocations[0]?.longitude || -58.381592,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onMapReady={() => setMapReady(true)}
              >
                {realTimeLocations.map((location, index) => 
                  renderSafeMarker(location, index)
                )}
              </MapView>
              
              <View style={styles.mapLegend}>
                <Text style={styles.mapLegendTitle}>{t('locationLegend')}</Text>
                <FlatList
                  data={realTimeLocations}
                  keyExtractor={(item, index) => `legend-${item.userId}-${index}`}
                  renderItem={({ item }) => {
                    // Verificar que las coordenadas sean válidas
                    const safeLocation = parseSafeLocation(item);
                    if (!safeLocation) return null;
                    
                    return (
                      <View style={styles.legendItem}>
                        <View style={styles.legendIcon} />
                        <View style={styles.legendInfo}>
                          <Text style={styles.legendName}>{item.username}</Text>
                          <Text style={styles.legendTimestamp}>
                            {new Date(item.timestamp).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                  style={styles.legendList}
                />
              </View>
            </View>
          ) : (
            <View style={styles.noLocationsContainer}>
              <Text style={styles.noLocationsText}>{t('noActiveUsers')}</Text>
            </View>
          )}
        </View>

        <View style={styles.recentActivityContainer}>
          <Text style={styles.sectionTitle}>{t('recentActivity')}</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.activityList}
              nestedScrollEnabled={true}
            >
              <FlatList
                data={recentActivity}
                renderItem={renderActivityItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: '#2e2e2e',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 15 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
    position: 'relative',
  },
  headerTitle: {
    fontSize: Math.min(width * 0.06, 24),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#ffffff',
    opacity: 0.8,
  },
  logoutButton: {
    backgroundColor: '#1c1c1c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
    marginTop: 35,
    right: 15,
    top: 15,
  },
  logoutButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.035, 14),
  },
  errorText: {
    color: '#e74c3c',
    padding: 10,
    textAlign: 'center',
    backgroundColor: '#fce8e6',
    margin: 10,
    borderRadius: 5,
  },
  statsContainer: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: Math.min(width * 0.05, 18),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    marginHorizontal: 15,
    marginTop: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff3e5',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#c1c1c1',
  },
  statValue: {
    fontSize: Math.min(width * 0.07, 28),
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#000000',
    opacity: 0.7,
  },
  actionsContainer: {
    margin: 15,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
  },
  actionButton: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  actionButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.04, 16),
  },
  recentActivityContainer: {
    margin: 15,
    flex: 1,
  },
  activityList: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.9,
  },
  activityTime: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#ffffff',
    opacity: 0.6,
    marginTop: 2,
  },
  // Estilos para ubicaciones en tiempo real
  realTimeLocationsContainer: {
    marginTop: 15,
    marginHorizontal: 15,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3e5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    margin: 15,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapLegendTitle: {
    fontSize: Math.min(width * 0.03, 12),
    fontWeight: 'bold',
    color: '#333333',
  },
  mapLegendText: {
    fontSize: Math.min(width * 0.03, 12),
    fontWeight: 'bold',
    color: '#333333',
  },
  markerContainer: {
    width: 40,
    height: 40,
  },
  markerBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  markerArrow: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderTopColor: '#4A90E2',
    borderWidth: 5,
    alignSelf: 'center',
    marginTop: -2,
  },
  noLocationsContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    margin: 15,
  },
  noLocationsText: {
    color: '#666666',
    fontSize: Math.min(width * 0.04, 16),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  legendIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
    marginRight: 10,
  },
  legendInfo: {
    flex: 1,
  },
  legendName: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#333333',
    fontWeight: 'bold',
  },
  legendTimestamp: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#666666',
  },
  legendList: {
    maxHeight: 150,
  },
});

export default AdminDashboardScreen;