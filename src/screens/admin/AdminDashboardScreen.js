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
import * as api from '../../services/api';

const AdminDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Cargar estadísticas
  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulamos la carga de estadísticas
      // En una implementación real, esto vendría de la API
      const users = await api.getUsers();
      
      // Calculamos estadísticas básicas
      const activeUsers = users.filter(user => user.isActive).length;
      
      setStats({
        totalUsers: users.length,
        activeUsers: activeUsers,
        totalTasks: Math.floor(Math.random() * 100) // Simulado
      });
    } catch (error) {
      setError(error.message || 'Error al cargar estadísticas');
      console.error('Error loading stats:', error);
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
      Alert.alert('Error', 'Error al cerrar sesión');
    }
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
          <Text style={styles.welcomeText}>Panel de Administración</Text>
          <Text style={styles.subHeaderText}>Bienvenido, {user?.username || 'Admin'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Tarjetas de estadísticas */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Estadísticas Generales</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Cargando estadísticas...</Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Usuarios Totales</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeUsers}</Text>
              <Text style={styles.statLabel}>Usuarios Activos</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalTasks}</Text>
              <Text style={styles.statLabel}>Tareas Totales</Text>
            </View>
          </View>
        )}
      </View>

      {/* Acciones rápidas */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Text style={styles.actionButtonText}>Gestionar Usuarios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={styles.actionButtonText}>Gestionar Tareas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('LocationHistory')}
          >
            <Text style={styles.actionButtonText}>Ver Historial de Ubicaciones</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actividad reciente */}
      <View style={styles.recentActivityContainer}>
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color="#4A90E2" />
        ) : (
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Juan inició sesión hace 10 minutos</Text>
                <Text style={styles.activityTime}>10:30 AM</Text>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>María comenzó a trabajar hace 30 minutos</Text>
                <Text style={styles.activityTime}>10:10 AM</Text>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Pedro finalizó su trabajo hace 1 hora</Text>
                <Text style={styles.activityTime}>9:45 AM</Text>
              </View>
            </View>
          </View>
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
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subHeaderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  errorText: {
    color: '#e74c3c',
    padding: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsContainer: {
    padding: 15,
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 15,
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recentActivityContainer: {
    padding: 15,
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityList: {
    marginTop: 10,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 15,
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
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default AdminDashboardScreen;
