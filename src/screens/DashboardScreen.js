import React, { useState, useEffect, useRef } from 'react';
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
  
  // Referencia para el intervalo de actualización de ubicación
  const locationUpdateIntervalRef = useRef(null);
  // Referencia para el intervalo de actualización de tareas
  const tasksUpdateIntervalRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    checkWorkStatus();
    
    // Iniciar actualización de la ubicación cada 10 segundos
    startLocationUpdates();
    
    // Iniciar actualización automática de tareas cada 15 segundos
    startTasksAutoUpdate();
    
    // Limpiar los intervalos al desmontar el componente
    return () => {
      if (locationUpdateIntervalRef.current) {
        clearInterval(locationUpdateIntervalRef.current);
      }
      if (tasksUpdateIntervalRef.current) {
        clearInterval(tasksUpdateIntervalRef.current);
      }
    };
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

  // Función para obtener las últimas tareas sin mostrar el indicador de carga
  const fetchLatestTasks = async () => {
    try {
      console.log('📥 Solicitando tareas actualizadas del servidor...');
      const userTasks = await api.getUserTasks();
      console.log(`📋 Tareas recibidas del servidor: ${userTasks.length}`);
      
      // Filtrar tareas pendientes
      const pendingTasks = userTasks.filter(task => !task.completed).slice(0, 3);
      console.log(`📝 Tareas pendientes filtradas: ${pendingTasks.length}`);
      
      // Actualizar siempre para asegurar que los cambios se reflejen
      console.log('🔄 Actualizando lista de tareas en pantalla');
      setTasks(pendingTasks);
    } catch (error) {
      console.error('❌ Error obteniendo tareas actualizadas:', error);
    }
  };

  // Function to load dashboard data
  const loadDashboardData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      console.log('🚀 Cargando datos iniciales del dashboard...');
      // Load pending tasks
      const userTasks = await api.getUserTasks();
      
      // Filtrar tareas pendientes
      const pendingTasks = userTasks.filter(task => !task.completed).slice(0, 3);
      setTasks(pendingTasks); // Only show 3 pending tasks
      console.log(`📋 Dashboard cargado con ${pendingTasks.length} tareas pendientes`);
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      if (showLoading) {
        setError(t('errorLoadingTasks'));
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Función para iniciar las actualizaciones de ubicación al servidor
  const startLocationUpdates = () => {
    // Limpiar cualquier intervalo existente
    if (locationUpdateIntervalRef.current) {
      clearInterval(locationUpdateIntervalRef.current);
    }
    
    // Crear un nuevo intervalo para enviar actualizaciones de ubicación cada 10 segundos
    locationUpdateIntervalRef.current = setInterval(() => {
      if (position) {
        sendLocationUpdate(position);
      }
    }, 10000); // 10 segundos
  };

  // Función para enviar la actualización de ubicación al servidor
  const sendLocationUpdate = async (coords) => {
    try {
      if (!coords || !coords.latitude || !coords.longitude) {
        return; // No enviar si no hay coordenadas válidas
      }
      
      const location = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString(),
        type: 'tracking' // Usar 'tracking' en lugar de 'real_time_update' para compatibilidad con el backend
      };
      
      // Usar la función saveLocations para enviar la ubicación al servidor
      await api.saveLocations([location]);
      console.log('Ubicación enviada al servidor:', JSON.stringify(location));
    } catch (error) {
      console.error('Error al enviar ubicación al servidor:', error);
    }
  };

  // Función para iniciar la actualización automática de tareas
  const startTasksAutoUpdate = () => {
    // Limpiar cualquier intervalo existente
    if (tasksUpdateIntervalRef.current) {
      clearInterval(tasksUpdateIntervalRef.current);
    }
    
    // Crear un nuevo intervalo para actualizar las tareas cada 15 segundos
    console.log('Configurando actualización automática de tareas cada 15 segundos');
    tasksUpdateIntervalRef.current = setInterval(() => {
      console.log('⏰ Ejecutando actualización automática de tareas...');
      fetchLatestTasks();
    }, 15000); // Reducido a 15 segundos para pruebas
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
      
      console.log('Registrando disponibilidad con coordenadas:', coords);
      
      // Registrar actividad de disponibilidad directamente, sin llamar a startWork
      try {
        console.log('Registrando actividad de disponibilidad...');
        const activityData = {
          type: 'task_activity', // Usar el tipo que el backend reconoce
          message: 'Usuario marcado como disponible',
          metadata: {
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            timestamp: new Date().toISOString(),
            availability: 'available' // Esto es crucial para identificar que es una actividad de disponibilidad
          }
        };
        
        console.log('Datos de actividad a enviar:', JSON.stringify(activityData));
        const activityResult = await api.saveActivity(activityData);
        console.log('Actividad registrada correctamente:', JSON.stringify(activityResult));
        
        setIsWorking(true);
        setWorkStartTime(new Date());
        
        Alert.alert(t('success'), t('workStarted'));
      } catch (activityError) {
        console.error('Error al registrar actividad:', activityError);
        Alert.alert(t('error'), activityError.message || t('errorStartingWork'));
      }
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
      
      console.log('Registrando no disponibilidad con coordenadas:', coords);
      
      // Registrar actividad de no disponibilidad directamente, sin llamar a endWork
      try {
        console.log('Registrando actividad de no disponibilidad...');
        const duration = workStartTime ? Math.floor((new Date() - workStartTime) / 1000) : 0;
        const activityData = {
          type: 'task_activity', // Usar el tipo que el backend reconoce
          message: `Usuario marcado como no disponible (duración: ${Math.floor(duration/60)} minutos)`,
          metadata: {
            duration: duration,
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            timestamp: new Date().toISOString(),
            availability: 'unavailable' // Esto es crucial para identificar que es una actividad de disponibilidad
          }
        };
        
        console.log('Datos de actividad a enviar:', JSON.stringify(activityData));
        const activityResult = await api.saveActivity(activityData);
        console.log('Actividad registrada correctamente:', JSON.stringify(activityResult));
        
        setIsWorking(false);
        setWorkStartTime(null);
        
        Alert.alert(t('success'), t('workEnded'));
      } catch (activityError) {
        console.error('Error al registrar actividad:', activityError);
        Alert.alert(t('error'), activityError.message || t('errorEndingWork'));
      }
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

  // Función para obtener la ubicación actual
  const handleLocationChange = (location) => {
    if (location && location.coords) {
      setPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      // Cada vez que cambia la ubicación, enviamos una actualización al servidor
      sendLocationUpdate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
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
      <View style={[styles.header, {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 243, 229, 0.1)',
        paddingBottom: 15,
        marginBottom: 10
      }]}>
        <Text style={[styles.welcomeText, { color: theme.colors.text.primary }]}>
          {t('Welcome')}, {user?.username || t('user')}
        </Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>
            {t('logOut')}
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

      {/* Location Card */}
      <View style={[styles.card, { 
        backgroundColor: '#2e2e2e',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 243, 229, 0.1)',
        overflow: 'hidden',
        marginHorizontal: 15
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
        
        {/* Map component */}
        <LocationComponent 
          onLocationChange={handleLocationChange} 
          showWorkControls={false}
          mapOnly={true}
          customHeight={240}
          transparentContainer={true}
          isWorking={isWorking}
        />

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
                <ActivityIndicator size="small" color="#fff3e5" />
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
              <ActivityIndicator size="small" color="#fff3e5" />
            ) : (
              <Text style={[styles.workButtonText, { color: theme.colors.text.dark }]}>{t('startWork')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Pending tasks Card */}
      <View style={{
        backgroundColor: '#2e2e2e',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 243, 229, 0.1)',
        overflow: 'hidden',
        marginHorizontal: 15,
        marginVertical: 10
      }}>
        <View style={{
          backgroundColor: theme.colors.primary,
          height: 30,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 0
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.text.dark
          }}>
            {t('pendingTasks')}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{padding: 15}} size="small" color="#fff3e5" />
        ) : tasks.length > 0 ? (
          <View style={{paddingTop: 5, paddingBottom: 5}}>
            {tasks.map((task, index) => (
              <TouchableOpacity 
                key={task._id || index} 
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  marginBottom: index === tasks.length - 1 ? 0 : 0
                }}
                onPress={() => navigation.navigate('TaskDetails', { taskId: task._id })}
              >
                <Text style={{fontSize: 16, fontWeight: '500', color: '#fff3e5'}}>
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{textAlign: 'center', fontSize: 16, paddingVertical: 20, color: '#fff3e5'}}>
            {t('noPendingTasks')}
          </Text>
        )}
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
    backgroundColor: '#1c1c1c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  logoutButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.035, 14),
  },
  errorText: {
    padding: 10,
    textAlign: 'center',
  },
  card: {
    borderRadius: 15,
    marginVertical: 10,
    overflow: 'hidden',
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  cardHeader: {
    padding: 15,
    borderBottomWidth: 0,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Los estilos mapContainer y cardBody han sido eliminados para simplificar la estructura
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
    backgroundColor: '#1c1c1c',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  workStatusText: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
    color: '#fff3e5',
  },
  taskItem: {
    paddingVertical: 12,
    paddingHorizontal: 5,
    // Se eliminó el borde inferior
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
    justifyContent: 'center',
    marginHorizontal: 8,
    marginVertical: 15,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    width: '80%',
  },
  navButtonText: {
    fontSize: 16,
    marginLeft: 5,
  },
});

export default DashboardScreen;