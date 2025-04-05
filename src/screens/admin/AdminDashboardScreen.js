import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../../services/api';

const AdminDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { strings, language, toggleLanguage } = useLanguage();
  
  // Debug logs to check if language context is loaded properly
  console.log('Current language:', language);
  console.log('Admin panel string:', strings?.adminPanel);
  
  const [stats, setStats] = useState({
    users: { total: 0, active: 0 },
    tasks: { total: 0, completed: 0, pending: 0, completionRate: 0 },
    locations: { total: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Cargar estadísticas
  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener estadísticas reales desde la API
      const statsData = await api.getAdminStats();
      setStats(statsData);
      
      // Obtener actividad reciente
      const activityData = await api.getRecentActivity();
      setRecentActivity(activityData);
    } catch (error) {
      setError(error.message || strings.loadDataError);
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadStats();
  }, []);

  // Función para refrescar los datos
  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await logout();
      // No es necesario navegar, el AppNavigator lo hará automáticamente
    } catch (error) {
      Alert.alert(strings.errorAlert, strings.logoutError);
    }
  };
  
  // Función para formatear la fecha y hora
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return strings.unknownDate;
    }
  };
  
  // Función para formatear el tiempo relativo
  const formatRelativeTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days} ${strings.daysAgo}`;
      } else if (hours > 0) {
        return `${hours} ${strings.hoursAgo}`;
      } else if (minutes > 0) {
        return `${minutes} ${strings.minutesAgo}`;
      } else {
        return `${seconds} ${strings.secondsAgo}`;
      }
    } catch (error) {
      return strings.someTimeAgo;
    }
  };
  
  // Función para renderizar un elemento de actividad
  const renderActivityItem = (activity, index) => {
    console.log("Renderizando actividad:", activity); // Depuración
    
    let activityText = '';
    let activityColor = '#4A90E2'; // Color predeterminado
    
    if (activity.type === 'task') {
      if (activity.action === 'completed') {
        activityText = `${activity.username} ${strings?.completedTask || 'completed the task'} "${activity.title}"`;
        activityColor = '#2ecc71'; // Verde para tareas completadas
      } else {
        activityText = `${activity.username} ${strings?.createdTask || 'created the task'} "${activity.title}"`;
        activityColor = '#3498db'; // Azul para tareas creadas
      }
    } else if (activity.type === 'location') {
      if (activity.action === 'started_working') {
        activityText = `${activity.username} ${strings?.startedWorking || 'started working'}`;
        activityColor = '#2ecc71'; // Verde para inicio de trabajo
      } else if (activity.action === 'stopped_working') {
        activityText = `${activity.username} ${strings?.stoppedWorking || 'stopped working'}`;
        activityColor = '#e74c3c'; // Rojo para fin de trabajo
      } else if (activity.action === 'tracking') {
        activityText = `${activity.username} ${strings?.updatedLocation || 'updated their location'}`;
        activityColor = '#f39c12'; // Naranja para actualizaciones
      }
    }
    
    // Si no hay texto de actividad (por ejemplo, si el tipo no coincide), mostrar información genérica
    if (!activityText && activity.username) {
      activityText = `${strings?.activityOf || 'Activity of'} ${activity.username}: ${activity.action || strings?.unknownAction || 'unknown action'}`;
    } else if (!activityText) {
      activityText = strings?.unknownActivity || 'Unknown activity';
      console.warn("Actividad sin información:", activity);
    }
    
    return (
      <View key={`${activity.id || index}-${index}`} style={styles.activityItem}>
        <View style={[styles.activityDot, { backgroundColor: activityColor }]} />
        <View style={styles.activityContent}>
          <Text style={[styles.activityText, {color: '#333333'}]}>{activityText}</Text>
          <Text style={[styles.activityTime, {color: '#999999'}]}>
            {formatRelativeTime(activity.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          {/* Force text to be visible regardless of context */}
          <Text style={[styles.welcomeText, {color: '#FFFFFF'}]}>
            {strings?.adminPanel || 'Admin Dashboard'}
          </Text>
          <Text style={[styles.subHeaderText, {color: '#FFFFFF'}]}>
            {strings?.welcome || 'Welcome'}, {user?.username || 'Admin'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.languageButton}
            onPress={toggleLanguage}
          >
            <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>
              {strings?.changeLanguage || (language === 'es' ? 'EN' : 'ES')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, {color: '#FFFFFF'}]}>
              {strings?.logout || 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Tarjetas de estadísticas */}
      <View style={styles.statsContainer}>
        <Text style={[styles.sectionTitle, {color: '#333333'}]}>
          {strings?.generalStats || 'General Statistics'}
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={[styles.loadingText, {color: '#666666'}]}>
              {strings?.loadingStats || 'Loading statistics...'}
            </Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>{stats.users.total}</Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.totalUsers || 'Total Users'}
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>{stats.users.active}</Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.activeUsers || 'Active Users'}
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>{stats.tasks.total}</Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.totalTasks || 'Total Tasks'}
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>{stats.tasks.completed}</Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.completedTasks || 'Completed Tasks'}
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>{stats.tasks.pending}</Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.pendingTasks || 'Pending Tasks'}
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>{stats.tasks.completionRate}%</Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.completionRate || 'Completion Rate'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Acciones rápidas */}
      <View style={styles.actionsContainer}>
        <Text style={[styles.sectionTitle, {color: '#333333'}]}>
          {strings?.quickActions || 'Quick Actions'}
        </Text>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Text style={[styles.actionButtonText, {color: '#FFFFFF'}]}>
              {strings?.manageUsers || 'Manage Users'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={[styles.actionButtonText, {color: '#FFFFFF'}]}>
              {strings?.manageTasks || 'Manage Tasks'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('LocationHistory')}
          >
            <Text style={[styles.actionButtonText, {color: '#FFFFFF'}]}>
              {strings?.viewLocationHistory || 'View Location History'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actividad reciente */}
      <View style={styles.recentActivityContainer}>
        <Text style={[styles.sectionTitle, {color: '#333333'}]}>
          {strings?.recentActivity || 'Recent Activity'}
        </Text>
        
        {loading ? (
          <ActivityIndicator size="small" color="#4A90E2" />
        ) : recentActivity.length > 0 ? (
          <View style={styles.activityList}>
            {recentActivity.map((activity, index) => renderActivityItem(activity, index))}
          </View>
        ) : (
          <Text style={[styles.emptyText, {color: '#666666'}]}>
            {strings?.noRecentActivity || 'No recent activity to display'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#4A90E2',
    borderBottomWidth: 1,
    borderBottomColor: '#3A80D2',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  languageButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    margin: 15,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recentActivityContainer: {
    margin: 15,
    marginBottom: 30,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
    marginTop: 5,
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
});

export default AdminDashboardScreen;
