import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setLanguage } from './src/services/location-service';
import { NavigationContainer } from '@react-navigation/native';

// Create a wrapper component to handle language updates
const LanguageWrapper = ({ children }) => {
  const { language } = useLanguage();

  useEffect(() => {
    setLanguage(language);
  }, [language]);

  return children;
};

const App = () => {
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
