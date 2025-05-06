import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setLanguage } from './src/services/location-service';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { registerForPushNotifications } from './src/services/notification-service';

// Create a wrapper component to handle language updates
const LanguageWrapper = ({ children }) => {
  const { language } = useLanguage();

  React.useEffect(() => {
    setLanguage(language);
  }, [language]);

  return children;
};

const App = () => {
  const [notificationsConfigured, setNotificationsConfigured] = useState(false);

  // Configure notifications for admin
  useEffect(() => {
    const configureNotifications = async () => {
      try {
        console.log('Configuring notifications...');
        
        // Set notification handler first
        Notifications.setNotificationHandler({
          handleNotification: async () => {
            console.log('Handling a notification');
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            };
          },
        });

        // Registrar para notificaciones push - Este paso envía el token al servidor
        const pushToken = await registerForPushNotifications();
        console.log('Push notification registration complete with token:', pushToken);

        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          console.log('Requesting notification permissions...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }
        
        console.log('Notification permission granted');
        
        // Guaranteed test notification after a delay to ensure everything is initialized
        setTimeout(async () => {
          try {
            console.log('Sending guaranteed test notification...');
            // Ya no usamos notificaciones locales, solo registramos que se configuró correctamente
            console.log('Notificaciones configuradas correctamente');
            setNotificationsConfigured(true);
          } catch (error) {
            console.error('Error setting up notifications:', error);
          }
        }, 3000); // 3 second delay
        
        // Check if user is admin
        try {
          const userInfoString = await AsyncStorage.getItem('userInfo');
          if (userInfoString) {
            const userInfo = JSON.parse(userInfoString);
            if (userInfo.isAdmin) {
              console.log('Admin user detected, enabling advanced notification handling');
              
              // Listen for notification received while app is running
              const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
                console.log('Notification received in foreground:', notification);
                // You could update UI or show an in-app alert here
              });
              
              // Listen for notification response (when user taps notification)
              const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('User tapped notification:', response);
                
                // Handle navigation based on notification data
                const data = response.notification.request.content.data;
                if (data && data.activityId) {
                  // You could navigate to specific activity screen here
                }
              });
              
              return () => {
                foregroundSubscription.remove();
                responseSubscription.remove();
              };
            }
          }
        } catch (error) {
          console.error('Error checking admin status for notifications:', error);
        }
        
        setNotificationsConfigured(true);
      } catch (error) {
        console.error('Error configuring notifications:', error);
      }
    };
    
    configureNotifications();
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <LanguageWrapper>
            <AuthProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </AuthProvider>
          </LanguageWrapper>
        </LanguageProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

export default App;
