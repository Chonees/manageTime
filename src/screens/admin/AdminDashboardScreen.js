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
  const [userAvailability, setUserAvailability] = useState([]); 
  const [loadingAvailability, setLoadingAvailability] = useState(false); 
  const [realTimeLocations, setRealTimeLocations] = useState([]); 
  const [loadingLocations, setLoadingLocations] = useState(false); 
  const [mapReady, setMapReady] = useState(false); 
  const mapRef = useRef(null); 

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statsData = await api.getAdminStats();
      setStats(statsData);

      await loadUserAvailability();

      await loadRealTimeLocations();
    } catch (error) {
      console.error('Error loading stats:', error);
      setError(error.message || t('errorLoadingStats'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserAvailability = async (silent = false) => {
    if (!user?.isAdmin) return;
    
    try {
      if (!silent) setLoadingAvailability(true);
      
      const availabilityData = await api.getUserAvailabilityStatus();
      console.log('Datos de disponibilidad cargados:', availabilityData?.length || 0);
      
      // Verificar que availabilityData sea un array
      if (!availabilityData || !Array.isArray(availabilityData)) {
        console.error('Error: getUserAvailabilityStatus no devolvió un array');
        setUserAvailability([]);
        return;
      }
      
      // Ordenar: primero disponibles, luego no disponibles
      const sortedAvailability = availabilityData.sort((a, b) => {
        // Primero ordenar por disponibilidad (disponibles primero)
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        
        // Si ambos tienen la misma disponibilidad, ordenar por timestamp (más reciente primero)
        return new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now());
      });
      
      setUserAvailability(sortedAvailability);
    } catch (error) {
      console.error('Error al cargar estado de disponibilidad:', error);
      // En caso de error, establecer array vacío para evitar que la UI se rompa
      setUserAvailability([]);
    } finally {
      if (!silent) setLoadingAvailability(false);
    }
  };

  const loadRealTimeLocations = async (silent = false) => {
    if (!user?.isAdmin) return;
    
    try {
      if (!silent) setLoadingLocations(true);
      let locations = [];
      
      try {
        locations = await api.getRealTimeLocations();
        console.log('Ubicaciones en tiempo real cargadas:', locations.length);
      } catch (error) {
        console.error('Error al cargar ubicaciones en tiempo real:', error);
        
        try {
          console.log('Intentando cargar ubicaciones del historial como respaldo...');
          const usersList = await api.getUsers();
          
          const recentLocations = [];
          for (const user of usersList) {
            if (user.isActive) {
              const history = await api.getLocationHistory(user._id);
              
              if (history && history.length > 0) {
                const mostRecent = history[0]; 
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
      
      setRealTimeLocations(locations);
    } catch (error) {
      console.error('Error general al cargar ubicaciones:', error);
    } finally {
      if (!silent) setLoadingLocations(false);
    }
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now - then) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} ${t('secondsAgo')}`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('hoursAgo')}`;
    return `${Math.floor(diffInSeconds / 86400)} ${t('daysAgo')}`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  useEffect(() => {
    loadStats();
    const periodicRefresh = setInterval(() => {
      loadUserAvailability(true);
      loadRealTimeLocations(true);
    }, 30000); 

    return () => {
      clearInterval(periodicRefresh);
    };
  }, []);

  const handleLogout = () => {
    Alert.alert(
      t('confirmLogout'),
      t('confirmLogoutMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('logout'),
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error logging out:', error);
            }
          }
        }
      ]
    );
  };

  const renderUserAvailabilityItem = ({ item }) => {
    const statusColor = item.isAvailable ? '#4CAF50' : '#FF5252';
    const statusText = item.isAvailable ? t('available') : t('unavailable');
    const statusIcon = item.isAvailable ? 'checkmark-circle' : 'close-circle';
    
    const formattedTime = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit', 
      minute: '2-digit'
    });
    
    const formattedDate = new Date(item.timestamp).toLocaleDateString();
    
    return (
      <View style={styles.availabilityItem}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
          <Ionicons name={statusIcon} size={16} color="#fff" />
        </View>
        <View style={styles.userInfoContainer}>
          <Text style={styles.usernameText}>{item.username}</Text>
          <View style={styles.statusDetailsContainer}>
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.timestampText}>{formattedDate} {formattedTime}</Text>
          </View>
        </View>
      </View>
    );
  };

  const parseSafeLocation = (location) => {
    if (!location) return null;
    
    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn('Coordenadas inválidas:', location);
      return null;
    }
    
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

  const centerMapOnUser = (location) => {
    if (!mapRef.current) return;
    
    const safeLocation = parseSafeLocation(location);
    if (!safeLocation) {
      console.warn('No se puede centrar en una ubicación inválida');
      return;
    }

    // Animar el mapa para centrar en la ubicación del usuario
    mapRef.current.animateToRegion({
      latitude: safeLocation.latitude,
      longitude: safeLocation.longitude,
      latitudeDelta: 0.01, // Zoom más cercano al centrar en un usuario
      longitudeDelta: 0.01,
    }, 1000); // Duración de la animación en ms
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

        <View style={styles.realTimeLocationsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: '#333333', marginBottom: 0, marginHorizontal: 0, marginTop: 0 }]}>{t('loggedUsers')}</Text>
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
                <FlatList
                  data={realTimeLocations}
                  keyExtractor={(item, index) => `legend-${item.userId}-${index}`}
                  renderItem={({ item }) => {
                    const safeLocation = parseSafeLocation(item);
                    if (!safeLocation) return null;
                    
                    return (
                      <TouchableOpacity 
                        style={styles.legendItem}
                        onPress={() => centerMapOnUser(item)}
                      >
                        <View style={styles.legendIcon} />
                        <View style={styles.legendInfo}>
                          <Text style={styles.legendName}>{item.username}</Text>
                          <Text style={styles.legendTimestamp}>
                            {new Date(item.timestamp).toLocaleString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
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

        <View style={styles.availabilityContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{language === 'es' ? 'Estado de Disponibilidad' : 'Availability Status'}</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => loadUserAvailability(false)}
            >
              <Ionicons name="refresh" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          
          {loadingAvailability ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>{language === 'es' ? 'Cargando estados...' : 'Loading statuses...'}</Text>
            </View>
          ) : userAvailability.length > 0 ? (
            <View style={styles.availabilityList}>
              <FlatList
                data={userAvailability}
                renderItem={renderUserAvailabilityItem}
                keyExtractor={(item) => `availability-${item.userId}`}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>{language === 'es' ? 'No hay información de disponibilidad' : 'No availability information'}</Text>
            </View>
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
    backgroundColor: '#2e2e2e', 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2e2e2e',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff3e5',
    opacity: 0.8,
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 243, 229, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  logoutButtonText: {
    color: '#fff3e5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    margin: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  errorText: {
    color: '#ff5252',
    padding: 10,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    borderRadius: 5,
    margin: 10,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#fff3e5',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#fff3e5',
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#2e2e2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff3e5',
    opacity: 0.7,
    marginTop: 5,
    textAlign: 'center',
  },
  actionsContainer: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    margin: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  actionButtonsContainer: {
    flexDirection: 'column',
  },
  actionButton: {
    backgroundColor: '#2e2e2e',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  actionButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: 16,
  },
  realTimeLocationsContainer: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    margin: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  refreshButton: {
    padding: 5,
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  mapContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#2e2e2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  map: {
    height: 250,
    width: '100%',
    borderRadius: 10,
  },
  mapLegend: {
    padding: 10,
    backgroundColor: '#2e2e2e',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  legendList: {
    maxHeight: 100,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    backgroundColor: 'rgba(28, 28, 28, 0.9)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    marginHorizontal: 2,
  },
  legendIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E74C3C',
    marginRight: 8,
  },
  legendInfo: {
    flex: 1,
  },
  legendName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  legendTimestamp: {
    fontSize: 12,
    color: '#fff3e5',
    opacity: 0.6,
  },
  noLocationsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
  },
  noLocationsText: {
    fontSize: 16,
    color: '#fff3e5',
    opacity: 0.7,
    textAlign: 'center',
  },
  availabilityContainer: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    margin: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
    marginBottom: 20,
  },
  availabilityList: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
    backgroundColor: '#2e2e2e',
  },
  statusIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfoContainer: {
    flex: 1,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  statusDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#fff3e5',
    opacity: 0.7,
  },
  timestampText: {
    fontSize: 12,
    color: '#fff3e5',
    opacity: 0.5,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#fff3e5',
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default AdminDashboardScreen;