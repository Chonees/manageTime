import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Animated, 
  Dimensions,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t } = useLanguage();
  
  // Referencias para las animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  
  // Función para animar los puntos de carga
  const animateLoadingDots = () => {
    // Crear una secuencia de animaciones para los puntos
    const animateDots = () => {
      // Secuencia para el primer punto
      Animated.sequence([
        Animated.timing(dot1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot1Anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]).start();
      
      // Secuencia para el segundo punto con un pequeño retraso
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2Anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 200);
      
      // Secuencia para el tercer punto con un retraso mayor
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot3Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3Anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          // Repetir la animación
          setTimeout(animateDots, 100);
        });
      }, 400);
    };
    
    // Iniciar la animación
    animateDots();
  };
  
  useEffect(() => {
    // Secuencia de animaciones para el logo
    Animated.sequence([
      // Primero, hacer aparecer el logo con un efecto de fade in y escala
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]),
    ]).start(() => {
      // Iniciar la animación de los puntos de carga
      animateLoadingDots();
      
      // Establecer un temporizador para navegar a la pantalla de login
      setTimeout(() => {
        navigation.replace('Login');
      }, 3000); // Mostrar la pantalla de splash durante 3 segundos
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2e2e2e" barStyle="light-content" />
      <View style={styles.contentContainer}>
        <Animated.View 
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center'
          }}
        >
          <Image 
            source={require('../../../assets/Work Proof LOGO CREMA.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          
          <Text style={styles.brandName}>WORK PROOF</Text>
          <Text style={styles.tagline}>Forwarding the way you work</Text>
          
          <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingDot, { opacity: dot1Anim }]} />
            <Animated.View style={[styles.loadingDot, { marginLeft: 8, opacity: dot2Anim }]} />
            <Animated.View style={[styles.loadingDot, { marginLeft: 8, opacity: dot3Anim }]} />
          </View>
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
  },
  logo: {
    width: Math.min(width * 1.9, 1000),
    height: Math.min(width * 1.3, 700),
    marginBottom: 0,
    alignSelf: 'center',
  },
  brandName: {
    fontSize: Math.min(width * 0.08, 32),
    color: '#fff3e5',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    marginTop: -20,
  },
  tagline: {
    fontSize: Math.min(width * 0.05, 20),
    color: '#fff3e5',
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: -5,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff3e5',
    opacity: 0.7,
  },
});

export default WelcomeScreen;
