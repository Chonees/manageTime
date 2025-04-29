import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  AppState,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getAdminActivities } from '../services/api';
import * as Notifications from 'expo-notifications';

const AdminNotificationBadge = () => {
  const [newActivitiesCount, setNewActivitiesCount] = useState(0);
  const [lastCheckedTime, setLastCheckedTime] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigation = useNavigation();
  const { t } = useLanguage();
  const theme = useTheme();
  
  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
          setIsAdmin(userInfo.isAdmin === true);
        }
      } catch (error) {
        console.log('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  // Load last checked time from storage
  useEffect(() => {
    const loadLastCheckedTime = async () => {
      try {
        const storedTime = await AsyncStorage.getItem('lastActivityCheckTime');
        if (storedTime) {
          setLastCheckedTime(new Date(storedTime));
        } else {
          // If no stored time, use current time
          const now = new Date();
          setLastCheckedTime(now);
          await AsyncStorage.setItem('lastActivityCheckTime', now.toISOString());
        }
      } catch (error) {
        console.log('Error loading last checked time:', error);
      }
    };
    
    if (isAdmin) {
      loadLastCheckedTime();
    }
  }, [isAdmin]);
  
  // Check for new activities when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && isAdmin) {
        console.log('App came to foreground, checking for new activities...');
        checkForNewActivities();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [isAdmin, lastCheckedTime]);
  
  // Check for new activities periodically
  useEffect(() => {
    let interval;
    
    if (isAdmin && lastCheckedTime) {
      // Initial check
      console.log('Admin user detected, performing initial activity check');
      checkForNewActivities();
      
      // Set up interval (every 30 seconds)
      interval = setInterval(() => {
        console.log('Performing periodic activity check');
        checkForNewActivities();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAdmin, lastCheckedTime]);
  
  // Function to check for new activities
  const checkForNewActivities = async () => {
    if (!isAdmin || !lastCheckedTime) return;
    
    try {
      console.log('Checking for new activities since', lastCheckedTime.toISOString());
      const response = await getAdminActivities({
        limit: 50,
        sort: '-createdAt'
      });
      
      if (response && response.activities && response.activities.length > 0) {
        console.log(`Received ${response.activities.length} activities from server`);
        
        // Count activities newer than last checked time
        const newActivities = response.activities.filter(activity => {
          const activityTime = new Date(activity.createdAt || activity.timestamp || activity.date);
          return activityTime > lastCheckedTime;
        });
        
        console.log(`Found ${newActivities.length} new activities since last check`);
        setNewActivitiesCount(newActivities.length);
        
        // Show notification for the most recent activity if there are new ones
        if (newActivities.length > 0 && Platform.OS !== 'web') {
          const latestActivity = newActivities[0];
          const username = latestActivity.username || 'User';
          const actionType = getActivityTypeText(latestActivity.type);
          
          console.log('Sending notification for latest activity:', latestActivity);
          
          // Local notification for admin
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `New Activity: ${actionType}`,
                body: `${username}: ${latestActivity.message || latestActivity.description || actionType}`,
                data: { activityId: latestActivity._id || latestActivity.id }
              },
              trigger: null, // Show immediately
            });
            console.log('Notification sent successfully');
          } catch (notifError) {
            console.error('Error showing notification:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new activities:', error);
    }
  };
  
  // Helper function to get readable activity type
  const getActivityTypeText = (type) => {
    const typeMap = {
      'task_create': 'Task Created',
      'task_update': 'Task Updated',
      'task_complete': 'Task Completed',
      'task_delete': 'Task Deleted',
      'task_assign': 'Task Assigned',
      'location_enter': 'Location Entered',
      'location_exit': 'Location Exited',
      'started_working': 'Started Working',
      'stopped_working': 'Stopped Working',
      'task_activity': 'Task Activity'
    };
    
    return typeMap[type] || type;
  };
  
  // Handle badge press
  const handleBadgePress = async () => {
    // Update last checked time
    const now = new Date();
    setLastCheckedTime(now);
    await AsyncStorage.setItem('lastActivityCheckTime', now.toISOString());
    
    // Reset counter
    setNewActivitiesCount(0);
    
    // Navigate to activities screen
    navigation.navigate('AdminActivities');
  };
  
  // Render the badge
  return (
    <TouchableOpacity 
      onPress={handleBadgePress}
      onLongPress={async () => {
        // Test notification on long press
        if (isAdmin && Platform.OS !== 'web') {
          try {
            console.log('Sending test notification from badge long press...');
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Admin Notification Test',
                body: 'This is a test notification from the badge component',
                data: { test: true }
              },
              trigger: null, // Show immediately
            });
            console.log('Badge test notification sent successfully');
            Alert.alert('Test Notification Sent', 'Check if you received the notification');
          } catch (error) {
            console.error('Error sending test notification:', error);
            Alert.alert('Error', 'Failed to send test notification: ' + error.message);
          }
        }
      }}
      style={[styles.badgeContainer, newActivitiesCount > 0 ? styles.activeBadge : styles.inactiveBadge]}
    >
      {newActivitiesCount > 0 && (
        <Text style={styles.badgeText}>{newActivitiesCount > 99 ? '99+' : newActivitiesCount}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 5,
  },
  activeBadge: {
    backgroundColor: '#FF3B30',
  },
  inactiveBadge: {
    backgroundColor: 'transparent',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default AdminNotificationBadge;
