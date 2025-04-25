import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LocationComponent from '../components/LocationComponent';
import * as api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { startLocationMonitoring, stopLocationMonitoring } from '../services/location-service';
import { startWork, endWork } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Obtener las dimensiones de la pantalla para un diseño responsive
const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState(null);
  const [tasks, setTasks] = useState([]);
  const theme = useTheme();
  
  // Estados para controlar el trabajo
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState(null);
  const [workTime, setWorkTime] = useState('00:00:00');
  const [loadingAction, setLoadingAction] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    checkWorkStatus();
  }, []);

  // Efecto para actualizar el contador de tiempo
  useEffect(() => {
    let interval;
    
    if (isWorking && workStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now - workStartTime;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setWorkTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorking, workStartTime]);

  // Verificar si el usuario está trabajando actualmente
  const checkWorkStatus = async () => {
    try {
      // En una implementación real, esto sería una llamada a la API
      // const status = await api.getWorkStatus();
      // setIsWorking(status.isWorking);
      // if (status.isWorking && status.startTime) {
      //   setWorkStartTime(new Date(status.startTime));
      // }
      
      // Por ahora, asumimos que no está trabajando
      setIsWorking(false);
      setWorkStartTime(null);
    } catch (error) {
      console.error('Error checking work status:', error);
    }
  };

  // Function to load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load pending tasks
      const userTasks = await api.getUserTasks();
      setTasks(userTasks.filter(task => !task.completed).slice(0, 3)); // Only show 3 pending tasks
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(t('errorLoadingTasks'));
    } finally {
      setLoading(false);
    }
  };

  // Function to get current location
  const handleLocationChange = (location) => {
    if (location && location.coords) {
      setPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    }
  };

  // Función para iniciar trabajo
  const handleStartWork = async () => {
    if (!position) {
      Alert.alert(t('error'), t('noLocationError'));
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: position.latitude,
        longitude: position.longitude
      };
      
      console.log('Enviando coordenadas al servidor:', coords);
      
      // Start work and location tracking
      const result = await api.startWork(coords);
      
      // Registrar explícitamente la actividad con un ID ficticio para evitar el error de taskId
      try {
        console.log('Intentando registrar actividad de disponibilidad...');
        const activityData = {
          type: 'location_enter', // Usar 'location_enter' que definitivamente está permitido
          message: 'Usuario marcado como disponible',
          metadata: {
            availability: 'available',
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            timestamp: new Date().toISOString()
          }
        };
        
        console.log('Datos de actividad a enviar:', JSON.stringify(activityData));
        const activityResult = await api.saveActivity(activityData);
        console.log('Actividad registrada correctamente:', JSON.stringify(activityResult));
      } catch (activityError) {
        console.error('Error al registrar actividad:', activityError);
      }
      
      setIsWorking(true);
      setWorkStartTime(new Date());
      
      Alert.alert(t('success'), t('workStarted'));
    } catch (error) {
      console.error('Error al iniciar trabajo:', error);
      Alert.alert(t('error'), error.message || t('errorStartingWork'));
    } finally {
      setLoadingAction(false);
    }
  };

  // Función para finalizar trabajo
  const handleEndWork = async () => {
    if (!position) {
      Alert.alert(t('error'), t('noLocationError'));
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: position.latitude,
        longitude: position.longitude
      };
      
      console.log('Enviando coordenadas al servidor:', coords);
      
      // End work and stop location tracking
      const result = await api.endWork(coords);
      
      // Registrar explícitamente la actividad con un ID ficticio para evitar el error de taskId
      try {
        console.log('Intentando registrar actividad de no disponibilidad...');
        const duration = workStartTime ? Math.floor((new Date() - workStartTime) / 1000) : 0;
        const activityData = {
          type: 'location_exit', // Usar 'location_exit' que definitivamente está permitido
          message: `Usuario marcado como no disponible (duración: ${Math.floor(duration/60)} minutos)`,
          metadata: {
            availability: 'unavailable',
            duration: duration,
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            timestamp: new Date().toISOString()
          }
        };
        
        console.log('Datos de actividad a enviar:', JSON.stringify(activityData));
        const activityResult = await api.saveActivity(activityData);
        console.log('Actividad registrada correctamente:', JSON.stringify(activityResult));
      } catch (activityError) {
        console.error('Error al registrar actividad:', activityError);
      }
      
      setIsWorking(false);
      setWorkStartTime(null);
      
      Alert.alert(t('success'), t('workEnded'));
    } catch (error) {
      console.error('Error al finalizar trabajo:', error);
      Alert.alert(t('error'), error.message || t('errorEndingWork'));
    } finally {
      setLoadingAction(false);
    }
  };

  // Function to refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
      await checkWorkStatus();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Function to log out
  const handleLogout = async () => {
    try {
      await logout();
      // No need to navigate, AppNavigator will do it automatically
    } catch (error) {
      Alert.alert(t('error'), t('errorLoggingOut'));
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      
      {/* Header with welcome text and logout */}
      <View style={styles.header}>
        <Text style={[styles.welcomeText, { color: theme.colors.text.primary }]}>
          {t('welcome')}, {user?.username || t('user')}
        </Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: theme.colors.primary }]}>
            {t('logOut')}
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

      {/* Location Card */}
      <View style={[styles.card, { 
        backgroundColor: theme.colors.input.background,
      }]}>
        <View style={[styles.cardHeader, { 
          backgroundColor: theme.colors.primary,
          height: 30,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 0
        }]}>
          <Text style={[styles.cardHeaderText, { color: theme.colors.text.dark }]}>
            {t('myLocation')}
          </Text>
        </View>
        
        {/* Map component with better proportions */}
        <View style={styles.mapContainer}>
          <LocationComponent 
            onLocationChange={handleLocationChange} 
            showWorkControls={false}
            mapOnly={true}
            customHeight={240}
            transparentContainer={true}
            isWorking={isWorking}
          />
        </View>

        {/* Disponible/No disponible Button */}
        {isWorking ? (
          <View style={styles.workStatusContainer}>
            <Text style={[styles.workStatusText, { color: theme.colors.text.primary }]}>
              {t('workingSince')} {workTime}
            </Text>
            <TouchableOpacity 
              style={[styles.workButton, { backgroundColor: theme.colors.error }]}
              onPress={handleEndWork}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.workButtonText, { color: theme.colors.text.dark }]}>{t('endWork')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.workButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleStartWork}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={[styles.workButtonText, { color: theme.colors.text.dark }]}>{t('startWork')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Pending tasks Card */}
      <View style={[styles.card, { 
        backgroundColor: theme.colors.input.background,
      }]}>
        <View style={[styles.cardHeader, { 
          backgroundColor: theme.colors.primary,
          height: 30,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 0
        }]}>
          <Text style={[styles.cardHeaderText, { color: theme.colors.text.dark }]}>
            {t('pendingTasks')}
          </Text>
        </View>

        <View style={styles.cardBody}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : tasks.length > 0 ? (
            tasks.map((task, index) => (
              <TouchableOpacity 
                key={task._id || index} 
                style={styles.taskItem}
                onPress={() => navigation.navigate('TaskDetails', { taskId: task._id })}
              >
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, { color: theme.colors.text.primary }]}>
                    {task.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.text.primary }]}>
              {t('noPendingTasks')}
            </Text>
          )}
        </View>
      </View>

      {/* Bottom Navigation Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.navButton, { backgroundColor: theme.colors.input.background }]}
          onPress={() => navigation.navigate('TaskScreen')}
        >
          <Ionicons name="list" size={20} color={theme.colors.text.primary} />
          <Text style={[styles.navButtonText, { color: theme.colors.text.primary }]}>
            {t('myTasks')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.colors.input.background }]}
          onPress={() => navigation.navigate('LocationHistory')}
        >
          <Ionicons name="location" size={20} color={theme.colors.text.primary} />
          <Text style={[styles.navButtonText, { color: theme.colors.text.primary }]}> 
            {t('locationHistory')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginTop: 25,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  logoutButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    padding: 10,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    marginHorizontal: 5,
    marginVertical: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  cardHeader: {
    padding: 15,
    borderBottomWidth: 0,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 280,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 3,
    paddingHorizontal: 0,
  },
  cardBody: {
    padding: 15,
  },
  workButton: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    borderRadius: 8,
  },
  workButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  workStatusContainer: {
    padding: 10,
    alignItems: 'center',
  },
  workStatusText: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
  },
  taskItem: {
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
    marginVertical: 15,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    flex: 0.48, // Deja un pequeño espacio entre botones
  },
  navButtonText: {
    fontSize: 16,
    marginLeft: 5,
  },
});

export default DashboardScreen;