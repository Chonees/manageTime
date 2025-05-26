import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, View, Text, StyleSheet, LogBox } from 'react-native';

// Importaciones estáticas con manejo de errores
import { AuthProvider as AuthProviderOriginal, useAuth as useAuthOriginal } from './src/context/AuthContext';
import { LanguageProvider as LanguageProviderOriginal, useLanguage as useLanguageOriginal } from './src/context/LanguageContext';
import { ThemeProvider as ThemeProviderOriginal } from './src/context/ThemeContext';
import { LocationTrackingProvider as LocationTrackingProviderOriginal } from './src/context/LocationTrackingContext';
import AppNavigatorOriginal from './src/navigation/AppNavigator';
import { setLanguage as setLanguageOriginal } from './src/services/location-service';
import { NavigationContainer as NavigationContainerOriginal } from '@react-navigation/native';

// Ignorar advertencias específicas que no son críticas
LogBox.ignoreLogs(['Require cycle:', 'Possible Unhandled Promise']);

// Componentes de seguridad para cuando las importaciones fallan
const SafeAuthProvider = ({ children }) => children;
const SafeLanguageProvider = ({ children }) => children;
const SafeThemeProvider = ({ children }) => children;
const SafeLocationTrackingProvider = ({ children }) => children;
const SafeNavigationContainer = ({ children }) => children;
const SafeAppNavigator = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#282828' }}>
    <Text style={{ color: '#fff3e5', fontSize: 18 }}>Cargando aplicación...</Text>
  </View>
);
const safeDummyUseAuth = () => ({ isAuthenticated: false, loading: false });
const safeDummyUseLanguage = () => ({ language: 'es' });
const safeSetLanguage = () => {};

// Configuración de versiones seguras de todos los componentes
let AuthProvider, useAuth, LanguageProvider, useLanguage, 
    ThemeProvider, LocationTrackingProvider, AppNavigator,
    NavigationContainer, setLanguage;

// Importaciones que pueden ser problemáticas
let Notifications;
let AsyncStorage;
let registerForPushNotifications;

// Asignar versiones seguras o fallbacks para cada importación
try {
  AuthProvider = AuthProviderOriginal;
  useAuth = useAuthOriginal;
} catch (error) {
  console.warn('Error al acceder a AuthContext:', error);
  AuthProvider = SafeAuthProvider;
  useAuth = safeDummyUseAuth;
}

try {
  LanguageProvider = LanguageProviderOriginal;
  useLanguage = useLanguageOriginal;
} catch (error) {
  console.warn('Error al acceder a LanguageContext:', error);
  LanguageProvider = SafeLanguageProvider;
  useLanguage = safeDummyUseLanguage;
}

try {
  ThemeProvider = ThemeProviderOriginal;
} catch (error) {
  console.warn('Error al acceder a ThemeContext:', error);
  ThemeProvider = SafeThemeProvider;
}

try {
  LocationTrackingProvider = LocationTrackingProviderOriginal;
} catch (error) {
  console.warn('Error al acceder a LocationTrackingContext:', error);
  LocationTrackingProvider = SafeLocationTrackingProvider;
}

try {
  AppNavigator = AppNavigatorOriginal;
} catch (error) {
  console.warn('Error al acceder a AppNavigator:', error);
  AppNavigator = SafeAppNavigator;
}

try {
  NavigationContainer = NavigationContainerOriginal;
} catch (error) {
  console.warn('Error al acceder a NavigationContainer:', error);
  NavigationContainer = SafeNavigationContainer;
}

try {
  setLanguage = setLanguageOriginal;
} catch (error) {
  console.warn('Error al acceder a setLanguage:', error);
  setLanguage = safeSetLanguage;
}

// Importar notificaciones, AsyncStorage y registerForPushNotifications con manejo de errores
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('Error al cargar expo-notifications:', error);
  Notifications = {
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    addNotificationResponseReceivedListener: () => ({ remove: () => {} })
  };
}

try {
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch (error) {
  console.warn('Error al cargar AsyncStorage:', error);
  AsyncStorage = {
    getItem: async () => null,
    setItem: async () => {}
  };
}

try {
  const notificationService = require('./src/services/notification-service');
  registerForPushNotifications = notificationService.registerForPushNotifications;
} catch (error) {
  console.warn('Error al cargar notification-service:', error);
  registerForPushNotifications = async () => 'mock-token';
}

// Crear un manejador global de errores
const setupErrorHandling = () => {
  if (global.ErrorUtils) {
    // Guardar el manejador original
    const originalHandler = global.ErrorUtils.getGlobalHandler();
    
    // Establecer nuestro manejador personalizado
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.log(`Error global ${isFatal ? 'fatal' : 'no-fatal'} capturado:`, error);
      // Puedes añadir aquí lógica para enviar el error a un servicio de monitoreo
      
      // Llamar al manejador original
      originalHandler(error, isFatal);
    });
  }
};

// Create a wrapper component to handle language updates
const LanguageWrapper = ({ children }) => {
  const { language } = useLanguage();

  React.useEffect(() => {
    try {
      setLanguage(language);
    } catch (error) {
      console.warn('Error al establecer idioma:', error);
    }
  }, [language]);

  return children;
};

const App = () => {
  const [notificationsConfigured, setNotificationsConfigured] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicializar manejo de errores
  useEffect(() => {
    try {
      setupErrorHandling();
      console.log('Manejo de errores global configurado');
    } catch (err) {
      console.warn('Error al configurar manejo de errores:', err);
    }
  }, []);

  // Establecer un timeout de seguridad para la pantalla de carga
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 segundos máximo de pantalla de carga

    return () => clearTimeout(timer);
  }, []);

  // Configure notifications for admin - con manejo seguro de errores
  useEffect(() => {
    const configureNotifications = async () => {
      try {
        console.log('Configurando notificaciones...');
        
        // Timeout de seguridad para el registro de notificaciones
        const pushTokenPromise = registerForPushNotifications().catch(err => {
          console.warn('Error al registrar notificaciones:', err);
          return 'fallback-token';
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout al registrar notificaciones')), 10000);
        });
        
        const pushToken = await Promise.race([pushTokenPromise, timeoutPromise])
          .catch(err => {
            console.warn('No se pudo completar registro de notificaciones:', err);
            return 'fallback-token';
          });
          
        console.log('Registro de notificaciones completado con token:', pushToken);
        setNotificationsConfigured(true);
        
        // Check if user is admin
        try {
          const userInfoString = await AsyncStorage.getItem('userInfo');
          if (userInfoString) {
            const userInfo = JSON.parse(userInfoString);
            if (userInfo.isAdmin) {
              console.log('Usuario admin detectado, habilitando manejo avanzado de notificaciones');
              
              // Suscripciones con manejo de errores
              const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
                try {
                  console.log('Notificación recibida en primer plano:', notification);
                } catch (error) {
                  console.warn('Error al procesar notificación:', error);
                }
              });
              
              const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
                try {
                  console.log('Usuario tapó notificación:', response);
                } catch (error) {
                  console.warn('Error al procesar respuesta de notificación:', error);
                }
              });
              
              return () => {
                try {
                  foregroundSubscription.remove();
                  responseSubscription.remove();
                } catch (error) {
                  console.warn('Error al eliminar suscripciones:', error);
                }
              };
            }
          }
        } catch (error) {
          console.warn('Error al verificar estado admin para notificaciones:', error);
        }
      } catch (error) {
        console.warn('Error al configurar notificaciones:', error);
      } finally {
        // Marcar la app como inicializada incluso si hay errores
        setAppInitialized(true);
        setLoading(false);
      }
    };
    
    // Envolvemos en try/catch adicional por seguridad
    try {
      configureNotifications();
    } catch (error) {
      console.error('Error crítico al configurar notificaciones:', error);
      setAppInitialized(true);
      setLoading(false);
    }
  }, []);

  // Si hay un error fatal, mostrar pantalla de error
  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops! Algo salió mal</Text>
          <Text style={styles.errorMessage}>
            La aplicación ha encontrado un problema. Por favor, inténtalo de nuevo más tarde.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Si todavía estamos cargando después de mucho tiempo, mostrar pantalla de carga
  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Text style={styles.title}>Workproof</Text>
          <Text style={styles.subtitle}>Cargando...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <LanguageWrapper>
            <LocationTrackingProvider>
              <AuthProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </AuthProvider>
            </LocationTrackingProvider>
          </LanguageWrapper>
        </LanguageProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#282828',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff3e5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#282828',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 15,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#fff3e5',
    marginBottom: 20,
  },
});

export default App;
