import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../translations/translations';

// Enhanced debug logs to check translations
console.log('LanguageContext - Translations loaded:', Object.keys(translations));
console.log('LanguageContext - Spanish sample keys:', Object.keys(translations.es).slice(0, 5));
console.log('LanguageContext - English sample keys:', Object.keys(translations.en).slice(0, 5));

// Deep copy function to ensure we create a completely new strings object
const deepCopy = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item));
  }
  
  const copy = {};
  Object.keys(obj).forEach(key => {
    copy[key] = deepCopy(obj[key]);
  });
  
  return copy;
};

// Create the language context
export const LanguageContext = createContext();

// Language provider component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('es'); // Default language is Spanish
  const [strings, setStrings] = useState(() => deepCopy(translations.es));
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Debug log for initial state
  console.log('LanguageProvider initialized with language:', language);
  
  // Load saved language preference on app start
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('language');
        console.log('LanguageContext - Saved language preference:', savedLanguage);
        
        if (savedLanguage && savedLanguage !== language) {
          console.log('LanguageContext - Applying saved language:', savedLanguage);
          
          if (translations[savedLanguage]) {
            setLanguage(savedLanguage);
            // Create a new object to ensure React detects the change
            setStrings(deepCopy(translations[savedLanguage]));
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('LanguageContext - Error loading language preference:', error);
        setIsInitialized(true);
      }
    };
    
    loadLanguagePreference();
  }, []);
  
  // Function to change the language
  const changeLanguage = useCallback(async (lang) => {
    try {
      console.log('LanguageContext - Changing language to:', lang);
      console.log('LanguageContext - Current language:', language);
      
      if (translations[lang]) {
        // First save to AsyncStorage to make sure it's persistent
        await AsyncStorage.setItem('language', lang);
        console.log('LanguageContext - Language saved in AsyncStorage');
        
        // Then update the state
        setLanguage(lang);
        
        // Create a completely new object to force React to detect the change
        const newStrings = deepCopy(translations[lang]);
        console.log('LanguageContext - Setting strings to new object with keys:', Object.keys(newStrings).slice(0, 5));
        setStrings(newStrings);
        
        console.log('LanguageContext - Language change complete');
        
        // Force a state refresh to ensure components re-render
        setTimeout(() => {
          console.log('LanguageContext - Verifying language change, current language:', lang);
        }, 10);
        
        return true;
      } else {
        console.error('LanguageContext - Invalid language:', lang);
        return false;
      }
    } catch (error) {
      console.error('LanguageContext - Error saving language preference:', error);
      return false;
    }
  }, [language]);
  
  // Toggle between Spanish and English with immediate console feedback
  const toggleLanguage = useCallback(() => {
    const currentLang = language;
    const newLanguage = currentLang === 'es' ? 'en' : 'es';
    
    console.log('LanguageContext - Toggling language from:', currentLang, 'to:', newLanguage);
    
    // Display before toggle values
    console.log('LanguageContext - Before toggle - Example translation:', strings?.locationHistoryTitle);
    
    changeLanguage(newLanguage)
      .then(success => {
        if (success) {
          console.log('LanguageContext - Toggle completed successfully');
        } else {
          console.error('LanguageContext - Toggle failed');
        }
      })
      .catch(error => {
        console.error('LanguageContext - Error during toggle:', error);
      });
  }, [language, strings, changeLanguage]);
  
  // Create a value object with both the state and methods
  const contextValue = {
    language,
    strings,
    changeLanguage,
    toggleLanguage,
    isInitialized
  };
  
  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  // Debug log for context usage
  // console.log('useLanguage hook called, current language:', context.language);
  
  return context;
}; 