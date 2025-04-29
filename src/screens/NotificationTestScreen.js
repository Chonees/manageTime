import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendDirectTestNotification, diagnoseNotificationIssues } from '../services/notification-service';
import { Ionicons } from '@expo/vector-icons';

const NotificationTestScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isAdmin, setIsAdmin] = useState(false);
  const [testCount, setTestCount] = useState(0);

  useEffect(() => {
    checkPermissions();
    checkAdminStatus();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setIsAdmin(userInfo.isAdmin === true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      setLoading(true);
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      setLoading(false);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Notification permission is required for admin notifications to work.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', 'Notification permission granted!');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', `Failed to request permissions: ${error.message}`);
    }
  };

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      const diagnosticResults = await diagnoseNotificationIssues();
      setResults(diagnosticResults);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', `Diagnostics failed: ${error.message}`);
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      setTestCount(prev => prev + 1);
      const count = testCount + 1;
      
      const success = await sendDirectTestNotification(
        `Test Notification #${count}`,
        `This is test notification #${count}. If you see this, notifications are working!`
      );
      
      setLoading(false);
      
      if (success) {
        Alert.alert(
          'Notification Sent',
          'A test notification has been sent. Did you receive it?',
          [
            {
              text: 'Yes',
              onPress: () => Alert.alert('Great!', 'Your notification system is working correctly.')
            },
            {
              text: 'No',
              onPress: () => runDiagnostics()
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to send test notification');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', `Failed to send test notification: ${error.message}`);
    }
  };

  const fixNotificationIssues = async () => {
    try {
      setLoading(true);
      
      // Reset notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      
      // Request permissions again
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        setLoading(false);
        Alert.alert(
          'Permission Required',
          'Notification permission is required for admin notifications to work.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Try to send a notification with a delay
      setTimeout(async () => {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Fixed Notification System',
              body: 'Your notification system should now be working correctly.',
            },
            trigger: null,
          });
          
          setLoading(false);
          Alert.alert(
            'Fix Applied',
            'The notification system has been reset. Did you receive the notification?',
            [
              {
                text: 'Yes',
                onPress: () => Alert.alert('Great!', 'Your notification system is now working correctly.')
              },
              {
                text: 'No',
                onPress: () => Alert.alert('Still Not Working', 'There may be a deeper issue with your device or Expo configuration.')
              }
            ]
          );
        } catch (error) {
          setLoading(false);
          Alert.alert('Error', `Failed to send notification after fix: ${error.message}`);
        }
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', `Failed to fix notification issues: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Test Center</Text>
        <Text style={styles.headerSubtitle}>Diagnose and fix notification issues</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Device Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform:</Text>
          <Text style={styles.infoValue}>{Platform.OS}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Admin User:</Text>
          <Text style={styles.infoValue}>{isAdmin ? 'Yes' : 'No'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Permission Status:</Text>
          <Text style={[
            styles.infoValue, 
            permissionStatus === 'granted' ? styles.statusGood : styles.statusBad
          ]}>
            {permissionStatus}
          </Text>
        </View>
      </View>
      
      {!isAdmin && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color="#FFA500" />
          <Text style={styles.warningText}>
            You are not logged in as an admin user. Admin notifications are only available for admin users.
          </Text>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        {permissionStatus !== 'granted' && (
          <TouchableOpacity 
            style={styles.button}
            onPress={requestPermissions}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Request Notification Permission</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.button}
          onPress={sendTestNotification}
          disabled={loading || permissionStatus !== 'granted'}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send Test Notification</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={runDiagnostics}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Run Diagnostics</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={fixNotificationIssues}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Fix Notification Issues</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Diagnostic Results</Text>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Permission Status:</Text>
            <Text style={[
              styles.resultValue, 
              results.permissionStatus === 'granted' ? styles.statusGood : styles.statusBad
            ]}>
              {results.permissionStatus}
            </Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Device:</Text>
            <Text style={styles.resultValue}>{results.deviceInfo}</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Can Schedule:</Text>
            <Text style={[
              styles.resultValue, 
              results.canScheduleNotifications ? styles.statusGood : styles.statusBad
            ]}>
              {results.canScheduleNotifications ? 'Yes' : 'No'}
            </Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Test Sent:</Text>
            <Text style={[
              styles.resultValue, 
              results.testNotificationSent ? styles.statusGood : styles.statusBad
            ]}>
              {results.testNotificationSent ? 'Yes' : 'No'}
            </Text>
          </View>
          
          {results.errors.length > 0 && (
            <View style={styles.errorsContainer}>
              <Text style={styles.errorsTitle}>Errors:</Text>
              {results.errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  header: {
    padding: 20,
    backgroundColor: '#1c1c1c',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 243, 229, 0.7)',
    marginTop: 5,
  },
  infoContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: 16,
    color: '#fff3e5',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff3e5',
    fontWeight: 'bold',
  },
  warningContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    color: '#FFA500',
    marginLeft: 10,
    flex: 1,
  },
  buttonContainer: {
    margin: 15,
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultLabel: {
    fontSize: 16,
    color: '#fff3e5',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusGood: {
    color: '#4CAF50',
  },
  statusBad: {
    color: '#F44336',
  },
  errorsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 5,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 5,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 5,
  },
});

export default NotificationTestScreen;
