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

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState(null);
  const [tasks, setTasks] = useState([]);
  const theme = useTheme();

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
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
          {t('welcome')}, {user?.username || t('user')}
        </Text>
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.colors.card }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: theme.colors.notification }]}>
            {t('logOut')}
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={[styles.errorText, { color: theme.colors.notification }]}>{error}</Text>}

      {/* Location component with work controls */}
      <LocationComponent 
        onLocationChange={handleLocationChange} 
        showWorkControls={true} 
      />

      {/* Pending tasks summary */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.cardHeader, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.cardTitle}>{t('pendingTasks')}</Text>
        </View>
        <View style={styles.cardBody}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : tasks.length > 0 ? (
            <>
              {tasks.map((task, index) => (
                <TouchableOpacity 
                  key={task.id} 
                  style={[styles.taskItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => navigation.navigate('TaskDetails', { taskId: task._id })}
                >
                  <View style={styles.taskIconContainer}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, { color: theme.colors.text }]}>{task.title}</Text>
                    <Text style={[styles.taskDescription, { color: theme.colors.text }]} numberOfLines={1}>
                      {task.description || t('noDescription')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.viewAllButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('TaskScreen')}
              >
                <Text style={[styles.viewAllButtonText, { color: theme.colors.background }]}>
                  {t('viewAllTasks')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>{t('noPendingTasks')}</Text>
          )}
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.navButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('TaskScreen')}
        >
          <Ionicons name="list" size={24} color={theme.colors.background} style={styles.buttonIcon} />
          <Text style={[styles.navButtonText, { color: theme.colors.background }]}>{t('myTasks')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('LocationHistory')}
        >
          <Ionicons name="location" size={24} color={theme.colors.background} style={styles.buttonIcon} />
          <Text style={[styles.navButtonText, { color: theme.colors.background }]}> 
            {t('locationHistory')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.colors.success || '#4CAF50' }]}
          onPress={() => navigation.navigate('LocationTrackingScreen')}
        >
          <Ionicons name="finger-print" size={24} color={theme.colors.background} style={styles.buttonIcon} />
          <Text style={[styles.navButtonText, { color: theme.colors.background }]}>Punch In</Text>
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 5,
  },
  logoutButtonText: {
    fontWeight: 'bold',
  },
  errorText: {
    padding: 10,
    textAlign: 'center',
  },
  card: {
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
  },
  taskDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  viewAllButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    marginVertical: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    marginTop: 10,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskTextContainer: {
    flex: 1,
  },
  taskDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  taskItemDivider: {
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
});

export default DashboardScreen;