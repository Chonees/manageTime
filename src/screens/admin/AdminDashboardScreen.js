import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../../services/api';

const AdminDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState({
    users: { total: 0 },
    tasks: { total: 0, completed: 0, pending: 0, completionRate: 0 },
    locations: { total: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]); // Añadir estado para actividades recientes

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
    } catch (error) {
      console.error('Error loading stats:', error);
      setError(error.message || t('errorLoadingStats'));
    } finally {
      setLoading(false);
    }
  };

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
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return t('justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('hoursAgo')}`;
    return formatDateTime(timestamp);
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

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>{t('adminDashboard')}</Text>
          <Text style={styles.subHeaderText}>{t('welcomeAdmin')}, {user?.username || 'Admin'}</Text>
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
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={styles.actionButtonText}>{t('taskManagement')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('LocationHistory')}
          >
            <Text style={styles.actionButtonText}>{t('locationHistory')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#9c27b0' }]}
            onPress={() => navigation.navigate('AdminActivities')}
          >
            <Text style={styles.actionButtonText}>{t('viewAllActivities')}</Text>
          </TouchableOpacity>
        </View>
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
  recentActivityContainer: {
    margin: 15,
    flex: 1,
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
    maxHeight: 300,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 14,
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default AdminDashboardScreen;
