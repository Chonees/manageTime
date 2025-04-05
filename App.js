import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  // Debug log for app initialization
  console.log('App component initializing');
  
  useEffect(() => {
    // Log when the app component has mounted
    console.log('App component mounted');
    
    // Check if translations module is available
    try {
      const { translations } = require('./src/translations/translations');
      console.log('Translations module loaded in App.js:', Object.keys(translations));
    } catch (error) {
      console.error('Error loading translations in App.js:', error);
    }
    
    return () => {
      console.log('App component unmounting');
    };
  }, []);
  
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
