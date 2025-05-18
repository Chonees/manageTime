import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Animated, 
  Dimensions,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t } = useLanguage();
  
  // Referencias para las animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    // Verificar si debemos mostrar la pantalla de bienvenida o ir directamente al login
    const checkAppStartState = async () => {
      try {
        const isLogout = await AsyncStorage.getItem('isLogout');
        
        if (isLogout === 'true') {
          // Si es un cierre de sesión, ir directamente a Login
          console.log('Cierre de sesión detectado, saltando pantalla de bienvenida');
          navigation.replace('Login');
          // Resetear el indicador para la próxima vez
          await AsyncStorage.setItem('isLogout', 'false');
        } else {
          // Es inicio normal de la app, mostrar animación y luego ir a Login
          console.log('Inicio de app detectado, mostrando pantalla de bienvenida');
          startWelcomeAnimation();
        }
      } catch (error) {
        console.error('Error al verificar estado de inicio:', error);
        // En caso de error, mostrar la animación por defecto
        startWelcomeAnimation();
      }
    };
    
    // Iniciar la verificación
    checkAppStartState();
    
    return () => {};
  }, []);
  
  // Función para iniciar la animación de bienvenida
  const startWelcomeAnimation = () => {
    // Secuencia de animaciones para el logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Navegar automáticamente a la pantalla de login después de mostrar el logo
      const timer = setTimeout(() => {
        navigation.navigate('Login');
      }, 2500); // Mostrar la pantalla de bienvenida durante 2.5 segundos
      
      return () => clearTimeout(timer);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2e2e2e" barStyle="light-content" />
      <View style={styles.contentContainer}>
        <Animated.View 
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
            width: '100%'
          }}
        >
          <Image 
            source={require('../../../assets/Work Proof LOGO CREMA.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          
          <View style={styles.titleContainer}>
            <Text style={styles.brandName}>W</Text>
            <Image 
              source={require('../../../assets/Selection.png')} 
              style={styles.iconImage} 
              resizeMode="contain"
            />
            <Text style={styles.brandName}>RK PROOF</Text>
          </View>
          <Text style={styles.tagline}>Forwarding the way you work</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  logo: {
    width: Math.min(width * 1.9, 1000),
    height: Math.min(width * 1.3, 700),
    marginBottom: -10,
    alignSelf: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    marginBottom: 0,
  },
  brandName: {
    fontSize: Math.min(width * 0.08, 32),
    color: '#fff3e5',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  iconImage: {
    width: Math.min(width * 0.10, 40),
    height: Math.min(width * 0.10, 40),
    marginHorizontal: 0,
    marginTop: 2,
  },
  tagline: {
    fontSize: Math.min(width * 0.05, 20),
    color: '#fff3e5',
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
    marginTop: -2,
  },
});

export default WelcomeScreen;
