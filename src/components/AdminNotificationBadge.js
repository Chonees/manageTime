import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  AppState
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  isUserAdmin, 
  checkForNewActivities, 
  loadLastCheckedTime, 
  updateLastCheckedTime
} from '../services/notification-service';

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
      const adminStatus = await isUserAdmin();
      setIsAdmin(adminStatus);
    };
    
    checkAdminStatus();
  }, []);
  
  // Load last checked time from storage
  useEffect(() => {
    const initLastCheckedTime = async () => {
      if (isAdmin) {
        const time = await loadLastCheckedTime();
        setLastCheckedTime(time);
      }
    };
    
    initLastCheckedTime();
  }, [isAdmin]);
  
  // Check for new activities when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && isAdmin) {
        console.log('App came to foreground, checking for new activities...');
        checkNewActivities();
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
      checkNewActivities();
      
      // Set up interval (every 30 seconds)
      interval = setInterval(() => {
        console.log('Performing periodic activity check');
        checkNewActivities();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAdmin, lastCheckedTime]);
  
  // Function to check for new activities
  const checkNewActivities = async () => {
    if (!isAdmin || !lastCheckedTime) return;
    
    try {
      const result = await checkForNewActivities(lastCheckedTime);
      setNewActivitiesCount(result.count);
    } catch (error) {
      console.error('Error in checkNewActivities:', error);
    }
  };
  
  // Handle badge press
  const handleBadgePress = async () => {
    // Update last checked time
    const now = await updateLastCheckedTime();
    setLastCheckedTime(now);
    
    // Reset counter
    setNewActivitiesCount(0);
    
    // Navigate to activities screen
    navigation.navigate('AdminActivities');
  };
  
  // Render the badge
  return (
    <TouchableOpacity 
      onPress={handleBadgePress}
      style={styles.badgeContainer}
    >
      <Ionicons 
        name="notifications" 
        size={22} 
        color={theme.colors.text} 
      />
      {newActivitiesCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {newActivitiesCount > 99 ? '99+' : newActivitiesCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default AdminNotificationBadge;
