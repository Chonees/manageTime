import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import LocationComponent from '../components/LocationComponent';
import * as api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState(null);
  const [tasks, setTasks] = useState([]);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Function to load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load pending tasks
      const userTasks = await api.getUserTasks();
      setTasks(userTasks.filter(task => !task.completed).slice(0, 3)); // Only show 3 pending tasks
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Could not load data. Please try again.');
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

  // Function to refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
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
      Alert.alert('Error', 'Error logging out');
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
        <Text style={styles.welcomeText}>Welcome, {user?.username || 'User'}</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Location component with work controls */}
      <LocationComponent 
        onLocationChange={handleLocationChange} 
        showWorkControls={true} 
      />

      {/* Pending tasks summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Pending Tasks</Text>
        </View>
        <View style={styles.cardBody}>
          {loading ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : tasks.length > 0 ? (
            <>
              {tasks.map((task, index) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskIconContainer}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#4A90E2" />
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDescription} numberOfLines={1}>
                      {task.description || 'No description'}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Tasks')}
              >
                <Text style={styles.viewAllButtonText}>View all tasks</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyText}>You have no pending tasks</Text>
          )}
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Tasks')}
        >
          <Ionicons name="list" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.navButtonText}>My Tasks</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('LocationHistory')}
        >
          <Ionicons name="map" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.navButtonText}>Location History</Text>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    padding: 10,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 15,
    marginVertical: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#4A90E2',
    padding: 15,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: 15,
  },
  taskItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskIconContainer: {
    marginRight: 10,
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 10,
  },
  viewAllButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginVertical: 15,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 15,
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default DashboardScreen;
