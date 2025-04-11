import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const LanguageToggle = ({ style }) => {
  const { language, toggleLanguage } = useLanguage();
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(language === 'en' ? 0 : 26)).current;
  
  const isEnglish = language === 'en';

  useEffect(() => {
    // Animar el cambio de posición del círculo
    Animated.spring(slideAnim, {
      toValue: isEnglish ? 0 : 26,
      friction: 6,
      tension: 40,
      useNativeDriver: true
    }).start();
  }, [isEnglish, slideAnim]);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        onPress={toggleLanguage} 
        style={[
          styles.switchContainer,
          { backgroundColor: isEnglish ? theme.colors.darkGrey : theme.colors.lightCream }
        ]}
        activeOpacity={0.8}
      >
        <Animated.View 
          style={[
            styles.switchCircle, 
            { 
              backgroundColor: isEnglish ? theme.colors.lightCream : theme.colors.darkGrey,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        />
        <Text style={[
          styles.switchText, 
          styles.enText,
          { color: isEnglish ? theme.colors.lightCream : theme.colors.darkGrey }
        ]}>
          EN
        </Text>
        <Text style={[
          styles.switchText, 
          styles.esText,
          { color: isEnglish ? theme.colors.darkGrey : theme.colors.lightCream }
        ]}>
          ES
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchContainer: {
    width: 60,
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    position: 'relative',
  },
  switchCircle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    left: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  switchText: {
    fontSize: 12,
    fontWeight: 'bold',
    zIndex: 1,
  },
  enText: {
    marginLeft: 3,
  },
  esText: {
    marginRight: 3,
  }
});

export default LanguageToggle;