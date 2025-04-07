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
    users: { total: 0 },
    tasks: { total: 0, completed: 0, pending: 0, completionRate: 0 },
    locations: { total: 0 }
  });
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
    } catch (error) {
      setError(error.message || 'Error al cargar datos');
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
      Alert.alert('Error', 'Error al cerrar sesión');
    }
  };
  
  // Función para formatear la fecha y hora
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Fecha desconocida';
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
        return `${days} días atrás`;
      } else if (hours > 0) {
        return `${hours} horas atrás`;
      } else if (minutes > 0) {
        return `${minutes} minutos atrás`;
      } else {
        return `${seconds} segundos atrás`;
      }
    } catch (error) {
      return 'hace un tiempo';
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
              <Text style={styles.statValue}>{stats.users.total}</Text>
              <Text style={styles.statLabel}>Usuarios Totales</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.tasks.total}</Text>
              <Text style={styles.statLabel}>Tareas Totales</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.tasks.completed}</Text>
              <Text style={styles.statLabel}>Tareas Completadas</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.tasks.pending}</Text>
              <Text style={styles.statLabel}>Tareas Pendientes</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.tasks.completionRate}%</Text>
              <Text style={styles.statLabel}>Tasa de Completado</Text>
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
            onPress={() => navigation.navigate('Users')}
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

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#9c27b0' }]}
            onPress={() => navigation.navigate('AdminActivities')}
          >
            <Text style={styles.actionButtonText}>Ver Todas las Actividades</Text>
          </TouchableOpacity>
        </View>
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
});

export default AdminDashboardScreen;
