import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './api';
import { Platform } from 'react-native';

// Import fetchWithRetry directly to avoid circular dependencies
const fetchWithRetry = async (url, options, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      console.log(`Fetch attempt ${i + 1} failed:`, error);
      lastError = error;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Configure notifications for the app
export const configureNotifications = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    return true;
  } catch (error) {
    console.error('Error configuring notifications:', error);
    return false;
  }
};

// Send a local notification
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Immediate notification
    });
    return true;
  } catch (error) {
    console.error('Error sending local notification:', error);
    return false;
  }
};

// Send an activity notification to admin
export const sendAdminActivityNotification = async (activityData) => {
  try {
    // Check if current user is admin
    const userInfoString = await AsyncStorage.getItem('userInfo');
    if (!userInfoString) return false;
    
    const userInfo = JSON.parse(userInfoString);
    const isAdmin = userInfo.isAdmin === true;
    
    // If current user is admin, send a local notification
    if (isAdmin) {
      const title = activityData.title || 'New Activity';
      const body = `${activityData.username || 'A user'}: ${activityData.message || 'performed an action'}`;
      
      await sendLocalNotification(title, body, activityData);
    }
    
    // Always send to server for potential push notifications to other admin devices
    await sendActivityToServer(activityData);
    
    return true;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return false;
  }
};

// Send activity data to server for admin notifications
const sendActivityToServer = async (activityData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;
    
    const url = `${getApiUrl()}/api/notifications/admin`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(activityData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send admin notification to server:', errorText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification to server:', error);
    return false;
  }
};

// Register for push notifications and store the token
export const registerForPushNotifications = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    
    // Store token locally
    await AsyncStorage.setItem('pushToken', token);
    
    // Send token to server
    await sendPushTokenToServer(token);
    
    return true;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
};

// Send push token to server
const sendPushTokenToServer = async (pushToken) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;
    
    // Check if the endpoint exists by making a lightweight OPTIONS request first
    try {
      const checkUrl = `${getApiUrl()}/api/users/push-token`;
      const checkResponse = await fetch(checkUrl, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // If the endpoint doesn't exist (404), log it but don't treat as an error
      if (checkResponse.status === 404) {
        console.log('Push token endpoint not available on server, skipping token registration');
        return true; // Return success to avoid showing errors to users
      }
    } catch (checkError) {
      // If check fails, assume endpoint might exist and try anyway
      console.log('Error checking push token endpoint:', checkError);
    }
    
    const url = `${getApiUrl()}/api/users/push-token`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pushToken })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      // Don't show this as an error, just log it
      console.log('Note: Push token registration not supported by server:', errorText);
      return true; // Return success to avoid showing errors to users
    }
    
    return true;
  } catch (error) {
    // Log but don't treat as a critical error
    console.log('Note: Could not register push token with server:', error);
    return true; // Return success to avoid showing errors to users
  }
};

// Send a direct test notification - this bypasses all checks and directly sends a notification
export const sendDirectTestNotification = async (title = 'Test Notification', body = 'This is a test notification') => {
  try {
    console.log('Attempting to send direct test notification...');
    
    // First ensure we have permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Requesting notification permission...');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.error('Notification permission denied');
        return false;
      }
    }
    
    // Set notification handler if not already set
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Send the notification with a random ID to ensure uniqueness
    const randomId = Math.floor(Math.random() * 1000000).toString();
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: { test: true, id: randomId },
      },
      identifier: `test-${randomId}`,
      trigger: null, // Show immediately
    });
    
    console.log('Direct test notification sent successfully with ID:', notificationId);
    return true;
  } catch (error) {
    console.error('Error sending direct test notification:', error);
    return false;
  }
};

// Function to check if notifications are working properly
export const diagnoseNotificationIssues = async () => {
  console.log('Diagnosing notification issues...');
  const results = {
    permissionStatus: 'unknown',
    deviceInfo: Platform.OS,
    canScheduleNotifications: false,
    testNotificationSent: false,
    errors: []
  };
  
  try {
    // Check permissions
    const { status } = await Notifications.getPermissionsAsync();
    results.permissionStatus = status;
    
    if (status !== 'granted') {
      results.errors.push('Notification permission not granted');
      return results;
    }
    
    // Try to send a test notification
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notification Diagnosis',
          body: 'Testing if notifications are working on your device',
        },
        trigger: null,
      });
      
      results.testNotificationSent = true;
      results.canScheduleNotifications = true;
      console.log('Diagnostic notification sent with ID:', notificationId);
    } catch (notifError) {
      results.errors.push(`Failed to schedule notification: ${notifError.message}`);
    }
    
    return results;
  } catch (error) {
    results.errors.push(`Diagnostic error: ${error.message}`);
    return results;
  }
};
