import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { LocationTrackingProvider } from './src/context/LocationTrackingContext';
import { IdleTimeProvider } from './src/context/IdleTimeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, LogBox, Text, View, StyleSheet, Button, ActivityIndicator, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// INTERRUPTORES PARA HABILITAR/DESHABILITAR PROVIDERS
// Cambia estos valores para probar diferentes combinaciones
const ENABLE_THEME_PROVIDER = true;          // Tema (colores, estilos)
const ENABLE_LANGUAGE_PROVIDER = true;       // Idioma
const ENABLE_LOCATION_PROVIDER = true;       // Ubicación (más problemático)
const ENABLE_AUTH_PROVIDER = true;           // Autenticación
const ENABLE_IDLE_TIME_PROVIDER = true;      // Seguimiento de tiempo de inactividad

// Ignorar todas las advertencias en producción para evitar que una advertencia interrumpa la app
if (!__DEV__) {
  LogBox.ignoreAllLogs();
} else {
  LogBox.ignoreLogs([
    'Require cycle:', 
    'AsyncStorage has been extracted',
    'ReactNativeFiberHostComponent',
    'NativeEventEmitter',
    'Setting a timer'
  ]);
}

// Desactivar cualquier intento de registrar notificaciones push
if (global.__EXPO_PUSH_TOKEN_RUNTIME_VALUE) {
  global.__EXPO_PUSH_TOKEN_RUNTIME_VALUE = null;
}

// Manejador global de errores para capturar cualquier excepción no manejada
const setupErrorHandling = () => {
  if (!global.ErrorUtils) return;
  
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Guardar el error para poder diagnosticarlo después
    try {
      const errorString = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
      console.log('Error global capturado:', errorString, 'Fatal:', isFatal);
      
      // Guardar en AsyncStorage para poder verlo después
      AsyncStorage.setItem('lastCriticalError', errorString).catch(() => {});
      
      // Mostrar alerta en modo desarrollo
      if (__DEV__) {
        Alert.alert('Error detectado', errorString.substring(0, 100) + '...', [{ text: 'OK' }]);
      }
    } catch (e) {
      console.log('Error al procesar excepción:', e);
    }
    
    // Llamar al manejador original
    originalHandler(error, isFatal);
  });
};

// Configurar manejo de errores tan pronto como sea posible
setupErrorHandling();

// Componente principal con inicialización progresiva
const App = () => {
  // Estados para manejar la inicialización y errores
  const [initStage, setInitStage] = useState(0); // 0=inicio, 1=SafeArea, 2=Theme, 3=Navigation, 4=Language, 5=LocationTracking, 6=Auth
  const [hasError, setHasError] = useState(false);
  const [errorComponent, setErrorComponent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Inicialización progresiva y segura
  useEffect(() => {
    const startApp = async () => {
      try {
        // Intentar limpiar cualquier error previo almacenado
        await AsyncStorage.removeItem('lastCriticalError').catch(() => {});
        
        // Registrar que la app está iniciando
        console.log('Inicio de app detectado, mostrando pantalla de bienvenida');
        
        // Verificar si hay un error fatal previo guardado
        const lastError = await AsyncStorage.getItem('lastCriticalError').catch(() => null);
        if (lastError) {
          console.log('Se detectó un error previo:', lastError.substring(0, 100));
        }
        
        // Simular una inicialización progresiva segura
        setTimeout(() => setInitStage(1), 100);  // SafeArea
        setTimeout(() => setInitStage(2), 200);  // Theme
        setTimeout(() => setInitStage(3), 300);  // Navigation
        setTimeout(() => setInitStage(4), 400);  // Language
        setTimeout(() => setInitStage(5), 500);  // LocationTracking 
        setTimeout(() => setInitStage(6), 600);  // Auth completado
      } catch (error) {
        console.error('Error durante la inicialización:', error);
        setHasError(true);
        setErrorMessage('Error durante la inicialización de la aplicación');
      }
    };

    startApp();
  }, []);

  // Manejador de errores por componente
  const handleComponentError = (component, error) => {
    console.error(`Error en componente ${component}:`, error);
    setHasError(true);
    setErrorComponent(component);
    setErrorMessage(error.message || `Error al inicializar ${component}`);
  };

  // Si ocurre un error durante la carga
  if (hasError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Error al iniciar la aplicación</Text>
        <Text style={styles.errorMessage}>
          {errorComponent ? `Error en componente: ${errorComponent}` : ''}
          {"\n"}
          {errorMessage || 'Por favor, reinicie la aplicación'}
        </Text>
        <Button 
          title="Reintentar" 
          onPress={() => {
            setHasError(false);
            setErrorComponent('');
            setErrorMessage('');
            setInitStage(0);
            setTimeout(() => setInitStage(1), 500);
          }} 
        />
      </View>
    );
  }

  // Renderizado progresivo de componentes
  if (initStage < 1) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff3e5" />
        <Text style={styles.loadingText}>Iniciando Workproof...</Text>
      </View>
    );
  }

  // Nivel 1: SafeAreaProvider
  if (initStage < 2) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#fff3e5" />
          <Text style={styles.loadingText}>Preparando interfaz...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Nivel 2: ThemeProvider
  if (initStage < 3) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#fff3e5" />
            <Text style={styles.loadingText}>Configurando tema...</Text>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Nivel 3: NavigationContainer
  if (initStage < 4) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer
            fallback={<ActivityIndicator size="large" color="#fff3e5" />}
            onReady={() => console.log('Navigation container is ready')}
          >
            <View style={styles.container}>
              <ActivityIndicator size="large" color="#fff3e5" />
              <Text style={styles.loadingText}>Configurando navegación...</Text>
            </View>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Nivel 4: LanguageProvider
  if (initStage < 5) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer fallback={<ActivityIndicator size="large" color="#fff3e5" />}>
            <LanguageProvider>
              <View style={styles.container}>
                <ActivityIndicator size="large" color="#fff3e5" />
                <Text style={styles.loadingText}>Configurando idioma...</Text>
              </View>
            </LanguageProvider>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Nivel 5: LocationTrackingProvider (el más problemático en TestFlight)
  if (initStage < 6) {
    try {
      return (
        <SafeAreaProvider>
          <ThemeProvider>
            <NavigationContainer fallback={<ActivityIndicator size="large" color="#fff3e5" />}>
              <LanguageProvider>
                <LocationTrackingProvider>
                  <View style={styles.container}>
                    <ActivityIndicator size="large" color="#fff3e5" />
                    <Text style={styles.loadingText}>Configurando seguimiento...</Text>
                  </View>
                </LocationTrackingProvider>
              </LanguageProvider>
            </NavigationContainer>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    } catch (error) {
      handleComponentError('LocationTrackingProvider', error);
      return (
        <SafeAreaProvider>
          <ThemeProvider>
            <NavigationContainer fallback={<ActivityIndicator size="large" color="#fff3e5" />}>
              <LanguageProvider>
                <View style={styles.container}>
                  <Text style={styles.errorTitle}>Error en ubicación</Text>
                  <Text style={styles.errorMessage}>No se pudo inicializar el servicio de ubicación</Text>
                  <Button title="Reintentar" onPress={() => setInitStage(0)} />
                </View>
              </LanguageProvider>
            </NavigationContainer>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    }
  }

  // Nivel 6: App completa con providers controlados por interruptores
  try {
    let jsxContent = <AppNavigator />;

    // Envolver con LocationTrackingProvider si está habilitado
    if (ENABLE_LOCATION_PROVIDER) {
      jsxContent = <LocationTrackingProvider>{jsxContent}</LocationTrackingProvider>;
    }

    // Envolver con AuthProvider si está habilitado
    if (ENABLE_AUTH_PROVIDER) {
      jsxContent = <AuthProvider>{jsxContent}</AuthProvider>;
    }

    // Envolver con IdleTimeProvider si está habilitado - debe ir DESPUÉS de Auth y Location
    if (ENABLE_IDLE_TIME_PROVIDER) {
      jsxContent = <IdleTimeProvider>{jsxContent}</IdleTimeProvider>;
    }

    // Envolver con LanguageProvider si está habilitado
    if (ENABLE_LANGUAGE_PROVIDER) {
      jsxContent = <LanguageProvider>{jsxContent}</LanguageProvider>;
    }

    // NavigationContainer es necesario siempre
    jsxContent = (
      <NavigationContainer
        fallback={<ActivityIndicator size="large" color="#fff3e5" />}
        onStateChange={() => console.log('Navigation state changed')}
      >
        {jsxContent}
      </NavigationContainer>
    );

    // Envolver con ThemeProvider si está habilitado
    if (ENABLE_THEME_PROVIDER) {
      jsxContent = <ThemeProvider>{jsxContent}</ThemeProvider>;
    }

    // SafeAreaProvider es necesario siempre
    return <SafeAreaProvider>{jsxContent}</SafeAreaProvider>;
  } catch (error) {
    // Última línea de defensa si todo lo demás falla
    handleComponentError('App Completa', error);
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Text style={styles.errorTitle}>Error inesperado</Text>
          <Text style={styles.errorMessage}>{error.message || 'Se ha producido un error inesperado'}</Text>
          <Button title="Reintentar" onPress={() => setInitStage(0)} />
        </View>
      </SafeAreaProvider>
    );
  }
};

// Estilos para las pantallas de carga y error
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    padding: 20,
  },
  loadingText: {
    color: '#fff3e5',
    fontSize: 18,
    marginTop: 10,
  },
  errorTitle: {
    color: '#fff3e5',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#fff3e5',
    textAlign: 'center',
    marginBottom: 20,
  }
});

export default App;
