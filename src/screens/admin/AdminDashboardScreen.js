import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import AdminActivityList from '../../components/AdminActivityList';
import AdminNotificationBadge from '../../components/AdminNotificationBadge';
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
  // Añadir temporizadores como referencias para poder limpiarlos en el useEffect
  const availabilityTimerRef = useRef(null);
  const locationsTimerRef = useRef(null);

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

  // Sobrescribir la lógica de la función loadRealTimeLocations para actualizar en tiempo real
  const loadRealTimeLocations = async (silent = false) => {
    if (!user?.isAdmin) return;
    
    try {
      if (!silent) setLoadingLocations(true);
      let locations = [];
      
      try {
        // Cargar ubicaciones en tiempo real
        locations = await api.getRealTimeLocations();
        console.log('Ubicaciones en tiempo real cargadas:', locations.length);
        
        // Obtener información de disponibilidad actualizada - haciendo una petición nueva cada vez
        // para asegurar que obtenemos los datos más recientes de la base de datos
        const availabilityData = await api.getUserAvailabilityStatus();
        console.log('Datos de disponibilidad obtenidos:', availabilityData?.length || 0);
        
        // Crear un mapa de disponibilidad por userId
        const availabilityMap = {};
        availabilityData.forEach(item => {
          if (item && item.userId) {
            // Normalizar ID para comparación (podría ser un objeto o string)
            const userId = typeof item.userId === 'object' ? item.userId._id : String(item.userId);
            availabilityMap[userId] = item.isAvailable;
          }
        });
        
        // Agregar la información de disponibilidad a las ubicaciones
        locations = locations.map(location => {
          // Normalizar el userId de la ubicación para comparar correctamente
          const locationUserId = typeof location.userId === 'object' ? 
            location.userId._id : String(location.userId);
          
          // Verificar si tenemos información de disponibilidad para este usuario
          const isUserAvailable = availabilityMap[locationUserId];
          
          return {
            ...location,
            isAvailable: isUserAvailable === true // Aseguramos que sea booleano
          };
        });
        
        // Actualizar el estado con las ubicaciones y sus estados de disponibilidad
        setRealTimeLocations(locations);
        
      } catch (error) {
        console.error('Error al cargar ubicaciones en tiempo real:', error);
        
        // Código de respaldo si falla la obtención de ubicaciones en tiempo real
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
      
      // Actualizar el estado con las ubicaciones obtenidas
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

  // Configurar intervalos para actualización automática
  useEffect(() => {
    // Cargar datos iniciales
    loadStats();
    
    // Configurar intervalo para actualizar disponibilidad cada 15 segundos
    availabilityTimerRef.current = setInterval(() => {
      loadUserAvailability(true); // Modo silencioso para evitar indicadores de carga
    }, 15000); // 15 segundos
    
    // Configurar intervalo para actualizar ubicaciones cada 10 segundos
    locationsTimerRef.current = setInterval(() => {
      loadRealTimeLocations(true); // Modo silencioso
    }, 10000); // 10 segundos
    
    // Limpiar intervalos al desmontar el componente
    return () => {
      if (availabilityTimerRef.current) clearInterval(availabilityTimerRef.current);
      if (locationsTimerRef.current) clearInterval(locationsTimerRef.current);
    };
  }, [user]); // Solo se ejecuta cuando cambia el usuario

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

  const handleManualRefresh = () => {
    console.log('Actualización manual iniciada');
    loadRealTimeLocations(false);
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
      <View style={styles.activityItem}>
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            {item.username} 
          </Text>
          <Text style={styles.activityTime}>
            {formatRelativeTime(item.timestamp)}
          </Text>
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

    console.log(`Centrando mapa en usuario: ${location.username}, coords: ${safeLocation.latitude}, ${safeLocation.longitude}`);

    // Animar el mapa para centrar en la ubicación del usuario con zoom cercano
    mapRef.current.animateToRegion({
      latitude: safeLocation.latitude,
      longitude: safeLocation.longitude,
      latitudeDelta: 0.005, // Zoom más cercano al centrar en un usuario específico
      longitudeDelta: 0.005,
    }, 800); // Duración de la animación en ms
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.colors.darkGrey} barStyle="light-content" />

      
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('adminDashboard')}</Text>
          <Text style={styles.headerSubtitle}>{t('welcomeAdmin', { name: user?.name || t('admin') })}</Text>
        </View>
        
        <View style={styles.headerActions}>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>{t('logOut')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <FlatList
        contentContainerStyle={{paddingTop: 5}}
        data={[1]} // Just need one item to render our content
        keyExtractor={() => 'dashboard-content'}
        renderItem={() => (
          <View>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>{t('statistics')}</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fff3e5" />
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
                    <Text style={styles.statLabel}>{t('Idle')}</Text>
                  </View>
                </View>
              )}
            </View>
            

            {/* Quick Actions Menu */}
            <View style={styles.actionsContainer}>
              <Text style={[styles.sectionTitle, {paddingHorizontal: 0}]}>{t('quickActions')}</Text>
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
                  style={[styles.actionButton, { backgroundColor: '#fff3e5' }]}
                  onPress={() => navigation.navigate('AdminActivities')}
                >
                  <View style={styles.actionButtonContent}>
                    <Text style={[styles.actionButtonText, { color: '#000' }]}>{t('viewAllActivities')}</Text>
                    <AdminNotificationBadge />
                  </View>
                </TouchableOpacity>

                

              </View>
            </View>
            
            {/* Real-time locations map */}
            <View style={styles.realTimeLocationsContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, {paddingHorizontal: 0}]}>{t('realTimeLocationOfUsers')}</Text>
                <TouchableOpacity 
                  onPress={handleManualRefresh}
                  style={{marginLeft: 10}}
                  disabled={loadingLocations}
                >
                  <Ionicons 
                    name="refresh-circle" 
                    size={24} 
                    color={loadingLocations ? '#666' : '#fff3e5'} 
                  />
                </TouchableOpacity>
              </View>
              
              {loadingLocations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fff3e5" />
                  <Text style={styles.loadingText}>{t('loadingLocations')}</Text>
                </View>
              ) : realTimeLocations.length > 0 ? (
                <View>
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
                  </View>
                  <View style={styles.usersLegendContainer}>
                    <View style={styles.mapLegendHeader}>
                      <Text style={styles.mapLegendTitle}>{t('loggedInUsers')}</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.userCount}>{realTimeLocations.length} {realTimeLocations.length === 1 ? t('user') : t('users')}</Text>
                        <TouchableOpacity 
                          onPress={handleManualRefresh}
                          style={{marginLeft: 8}}
                          disabled={loadingLocations}
                        >
                          <Ionicons 
                            name="refresh-circle" 
                            size={22} 
                            color={loadingLocations ? '#666' : '#fff3e5'} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <FlatList
                      data={realTimeLocations}
                      keyExtractor={(item, index) => `legend-${item.userId}-${index}`}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.legendItem}
                          onPress={() => centerMapOnUser(item)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.userCircle,
                            item.isAvailable ? styles.userCircleAvailable : null
                          ]}>
                            <Text style={styles.userInitial}>{item.username ? item.username.charAt(0).toUpperCase() : '?'}</Text>
                          </View>
                          <View style={styles.userInfoContainer}>
                            <Text style={styles.userName} numberOfLines={1}>{item.username}</Text>
                          </View>
                          {item.isAvailable && (
                            <Text style={[styles.statusText, styles.availableText]}>
                              {`- ${t('available')}`}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      style={styles.legendList}
                      showsVerticalScrollIndicator={true}
                      initialNumToRender={10}
                      maxToRenderPerBatch={20}
                      windowSize={10}
                      horizontal={false}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.noLocationsContainer}>
                  <Text style={styles.noLocationsText}>{t('noActiveUsers')}</Text>
                </View>
              )}
            </View>

            
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.lightCream]}
            tintColor={theme.colors.lightCream}
          />
        }
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },


  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 15,
    backgroundColor: '#2e2e2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
  },
  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 22,

    fontWeight: 'bold',
    color: '#fff3e5',
  },
  headerSubtitle: {

    fontSize: 14,
    color: 'rgba(255, 243, 229, 0.7)',
    marginTop: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.3)',
  },
  logoutButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: 14,
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
    paddingHorizontal: 15,
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
    paddingHorizontal: 15,
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

    fontSize: 28,

    fontWeight: 'bold',
    color: '#fff3e5',
  },
  statLabel: {
    fontSize: 14,

    color: '#ffffff',

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
  actionButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',

    fontSize: 14,
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
    height: height * 0.4,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  usersLegendContainer: {
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  mapLegendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  mapLegendTitle: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userCount: {
    color: '#fff3e5',
    fontSize: 12,
    opacity: 0.8,
  },
  legendList: {
    maxHeight: height * 0.2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    padding: 6,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    paddingRight: 15,
    minWidth: 160,
  },
  userCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
    marginRight: 12,
  },
  userCircleAvailable: {
    backgroundColor: '#4CAF50', // Verde para usuarios disponibles
  },
  userInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
  availableText: {
    color: '#4CAF50',
  },
  unavailableText: {
    color: '#FF5252',
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
});

export default AdminDashboardScreen;