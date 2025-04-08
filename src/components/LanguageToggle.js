import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const LanguageToggle = ({ style }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <TouchableOpacity 
      onPress={toggleLanguage} 
      style={[styles.languageToggle, style]}
    >
      <Text style={styles.languageText}>
        {language === 'en' ? 'ES' : 'EN'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  languageToggle: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    marginLeft: 10,
  },
  languageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
});

export default LanguageToggle; 