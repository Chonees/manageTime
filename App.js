import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setLanguage } from './src/services/location-service';

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
    <SafeAreaProvider>
      <LanguageProvider>
        <LanguageWrapper>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </LanguageWrapper>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};

export default App;
