import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const AdminPanelScreen = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !user.isAdmin) {
      Alert.alert(t('error'), t('adminAccessRequired'));
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load users first
      const usersData = await api.getUsers();
      setUsers(usersData);
      
      // Then load tasks
      const tasksData = await api.getTasks();
      setTasks(tasksData);

      // Load recent activities
      const activitiesData = await api.getRecentActivities();
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || t('errorLoadingTasks'));
      Alert.alert(t('error'), error.message || t('errorLoadingTasks'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    Alert.alert(
      t('confirmDelete'),
      t('deleteConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTask(taskId);
              setTasks(tasks.filter(task => task._id !== taskId));
              Alert.alert(t('success'), t('taskDeleted'));
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert(t('error'), error.message || t('errorDeletingTask'));
            }
          }
        }
      ]
    );
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const updatedTask = await api.updateTask(taskId, { completed: true });
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, completed: true } : task
      ));
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert(t('error'), error.message || t('errorUpdatingTask'));
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return t('secondsAgo');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('hoursAgo')}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ${t('daysAgo')}`;
    return t('someTimeAgo');
  };

  const renderActivity = ({ item }) => {
    const user = users.find(u => u._id === item.userId);
    const username = user ? user.username : t('unknownUser');
    
    let activityText = item.message || '';
    let iconName = 'help-circle-outline';
    let iconColor = '#666';

    switch (item.type) {
      case 'location_enter':
        activityText = activityText || t('locationEnter');
        iconName = 'enter-outline';
        iconColor = '#4CAF50';
        break;
      case 'location_exit':
        activityText = activityText || t('locationExit');
        iconName = 'exit-outline';
        iconColor = '#F44336';
        break;
      case 'task_complete':
        activityText = activityText || t('taskComplete');
        iconName = 'checkmark-circle-outline';
        iconColor = '#4CAF50';
        break;
      case 'task_create':
        activityText = activityText || t('taskCreate');
        iconName = 'add-circle-outline';
        iconColor = '#2196F3';
        break;
      case 'task_update':
        activityText = activityText || t('taskUpdate');
        iconName = 'create-outline';
        iconColor = '#FF9800';
        break;
      case 'task_delete':
        activityText = activityText || t('taskDelete');
        iconName = 'trash-outline';
        iconColor = '#F44336';
        break;
    }

    return (
      <View style={styles.activityItem}>
        <Ionicons name={iconName} size={24} color={iconColor} style={styles.activityIcon} />
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            {activityText}
          </Text>
          <Text style={styles.activityTime}>{formatTimeAgo(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  const renderTask = ({ item }) => {
    let assignedUserName = t('noUserAssigned');
    if (item.userId) {
      if (item._username) {
        assignedUserName = item._username;
      } else {
        const assignedUser = users.find(u => u._id === item.userId);
        if (assignedUser) {
          assignedUserName = assignedUser.username;
        }
      }
    }

    return (
      <View style={styles.taskItem}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{item.title || t('noTitle')}</Text>
          <TouchableOpacity 
            onPress={() => handleDeleteTask(item._id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.taskDetails}>
          <Text style={styles.taskDescription}>{item.description || ''}</Text>
          
          <View style={styles.assignedToContainer}>
            <Text style={styles.assignedToLabel}>{t('assignedTo')}:</Text>
            <Text style={styles.assignedToValue}>{assignedUserName}</Text>
          </View>
          
          <View style={styles.taskFooter}>
            <Text style={styles.taskDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              style={[
                styles.completeButton,
                item.completed && styles.completedButton
              ]}
              onPress={() => handleCompleteTask(item._id)}
            >
              <Text style={styles.completeButtonText}>
                {item.completed ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('recentActivity')}</Text>
        {activities.length > 0 ? (
          <FlatList
            data={activities}
            renderItem={renderActivity}
            keyExtractor={item => item._id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('noRecentActivity')}</Text>
              </View>
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noRecentActivity')}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('taskManagement')}</Text>
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={item => item._id}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('noTasks')}</Text>
            </View>
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
  },
  username: {
    fontWeight: 'bold',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 20,
    fontWeight: 'bold',
  },
  taskDetails: {
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  assignedToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  assignedToLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  assignedToValue: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  taskDate: {
    fontSize: 12,
    color: '#666',
  },
  completeButton: {
    padding: 5,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
});

export default AdminPanelScreen; 