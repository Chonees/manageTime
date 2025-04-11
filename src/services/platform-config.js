import { Platform } from 'react-native';
import Constants from 'expo-constants';

// URL base para el backend en producción
const BACKEND_URL = 'https://managetime-backend-48f256c2dfe5.herokuapp.com';

// Configuración específica para cada plataforma
const platformConfig = {
  // Configuración del mapa
  map: {
    // Proveedor del mapa (Google Maps para Android, Apple Maps para iOS)
    provider: Platform.OS === 'android' ? 'google' : 'apple',
    
    // API Key para Google Maps (solo necesaria para Android)
    googleMapsApiKey: 'AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw',
    
    // Opciones específicas para cada plataforma
    options: {
      android: {
        showsMyLocationButton: true,
        showsUserLocation: true,
        toolbarEnabled: true,
      },
      ios: {
        showsMyLocationButton: true,
        showsUserLocation: true,
        showsCompass: true,
      }
    }
  },
  
  // Configuración de permisos de ubicación
  location: {
    // Precisión de la ubicación
    accuracy: {
      android: 'balanced',
      ios: 'best'
    },
    
    // Tiempo máximo para obtener la ubicación (en ms)
    timeout: 20000,
    
    // Edad máxima aceptable para una ubicación (en ms)
    maximumAge: 10000,
    
    // Distancia mínima entre actualizaciones (en metros)
    distanceFilter: 10,
    
    // Opciones específicas para cada plataforma
    options: {
      android: {
        enableHighAccuracy: true,
        distanceFilter: 5,
        fastestInterval: 5000,
        interval: 10000,
        maxWaitTime: 15000,
        showLocationDialog: true,
        forceRequestLocation: true
      },
      ios: {
        enableHighAccuracy: true,
        distanceFilter: 5,
        timeInterval: 5000
      }
    }
  },
  
  // Configuración específica para cada sistema operativo
  android: {
    // Configuración específica para Android
    config: {
      // Tiempo de espera para peticiones (en ms)
      timeout: 90000,
      
      // Número máximo de reintentos para peticiones
      maxRetries: 5,
      
      // Tiempo de espera entre reintentos (en ms)
      retryDelay: 1000,
      
      // URL de la API
      apiUrl: BACKEND_URL,
      
      // Opciones de fetch para Android
      fetchOptions: {
        cache: 'no-cache',
        credentials: 'same-origin',
        mode: 'cors'
      }
    }
  },
  
  ios: {
    // Configuración específica para iOS
    config: {
      // Tiempo de espera para peticiones (en ms)
      timeout: 30000,
      
      // Número máximo de reintentos para peticiones
      maxRetries: 3,
      
      // Tiempo de espera entre reintentos (en ms)
      retryDelay: 2000,
      
      // URL de la API
      apiUrl: BACKEND_URL,
      
      // iOS suele funcionar bien con la configuración predeterminada
      fetchOptions: {
        cache: 'default',
        credentials: 'same-origin',
        mode: 'cors'
      }
    }
  }
};

// Función para detectar si estamos en modo túnel y obtener la URL correspondiente
function detectTunnelUrl() {
  try {
    // Forzar el uso de la URL de Heroku para dispositivos móviles
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return BACKEND_URL;
    }
    
    // Para desarrollo web, también usar Heroku
    return BACKEND_URL;
  } catch (error) {
    console.error('Error al detectar modo:', error);
    return BACKEND_URL;
  }
}

// Función para obtener la configuración específica de la plataforma actual
export const getPlatformConfig = (section) => {
  if (!section) return platformConfig;
  return platformConfig[section] || {};
};

// Función para obtener opciones específicas de la plataforma actual
export const getPlatformOptions = (section) => {
  const config = getPlatformConfig(section);
  if (!config.options) return {};
  
  return config.options[Platform.OS] || {};
};

// Exportar configuración específica para mapas
export const mapConfig = {
  provider: Platform.OS === 'android' ? 'google' : null,
  apiKey: platformConfig.map.googleMapsApiKey,
  showsUserLocation: true,
  showsMyLocationButton: true,
  toolbarEnabled: Platform.OS === 'android' ? true : undefined,
  showsCompass: true,
  rotateEnabled: true,
  scrollEnabled: true,
  zoomEnabled: true,
  zoomControlEnabled: true,
};

// Función para obtener la URL de la API según la plataforma
export const getApiBaseUrl = () => {
  // Primero intentar detectar si estamos en modo túnel
  const tunnelUrl = detectTunnelUrl();
  if (tunnelUrl) {
    return tunnelUrl;
  }
  
  // Si no estamos en modo túnel, usar la URL de Heroku
  const config = getPlatformConfig('config');
  return config.apiUrl;
};

// Alias for getApiBaseUrl to maintain backward compatibility
export const getApiUrl = getApiBaseUrl;

// Función para obtener opciones de fetch según la plataforma
export const getFetchOptions = (customOptions = {}) => {
  const config = getPlatformConfig(Platform.OS);
  return {
    ...config.config.fetchOptions,
    ...customOptions
  };
};

// Función para obtener el timeout según la plataforma
export const getTimeout = () => {
  const config = getPlatformConfig(Platform.OS);
  return config.config.timeout;
};

export default platformConfig;
