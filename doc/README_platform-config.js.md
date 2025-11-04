# README: src/services/platform-config.js - Configuración Multi-Plataforma y Entornos

## 📋 **¿Qué es este archivo?**

`platform-config.js` es el **centro de configuración adaptativa** de ManageTime. Gestiona todas las configuraciones específicas para iOS/Android, detecta el entorno de ejecución (desarrollo/producción/túnel), configura URLs de API dinámicamente, y proporciona configuraciones optimizadas para mapas, ubicación GPS y peticiones HTTP según la plataforma.

## 🎯 **Propósito**
- Centralizar configuraciones específicas de plataforma
- Detectar y adaptar URLs según entorno (local/túnel/Heroku)
- Optimizar configuraciones GPS para iOS vs Android
- Configurar Google Maps vs Apple Maps automáticamente
- Establecer timeouts y reintentos según plataforma
- Manejar API keys de forma segura
- Proporcionar fallbacks para producción

## ⚡ **¿Cómo funciona?**

El sistema **detecta automáticamente** la plataforma y entorno:
1. **Detecta plataforma** (iOS/Android/Web)
2. **Determina URL API** (Heroku por defecto)
3. **Configura mapas** según proveedor nativo
4. **Optimiza GPS** con parámetros específicos
5. **Ajusta timeouts** según rendimiento esperado
6. **Proporciona fallbacks** para estabilidad

---

## 📖 **Estructura de Configuración**

### **Líneas 5-12: URL del Backend**
```javascript
const BACKEND_URL = API_URL || 'https://managetime-backend-48f256c2dfe5.herokuapp.com';

if (!API_URL) {
  console.warn('ADVERTENCIA: La variable API_URL no está definida en .env');
} else {
  console.log('URL del backend configurada:', BACKEND_URL);
}
```
- **Variable de entorno**: Prioridad a `.env`
- **Fallback Heroku**: URL de producción por defecto
- **Logging**: Advertencia si falta configuración

---

## 🗺️ **Configuración de Mapas (Líneas 16-37)**

### **Estructura:**
```javascript
map: {
  // Proveedor según plataforma
  provider: Platform.OS === 'android' ? 'google' : 'apple',
  
  // API Key para Google Maps
  googleMapsApiKey: 'AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw',
  
  options: {
    android: {
      showsMyLocationButton: true,
      showsUserLocation: true,
      toolbarEnabled: true,  // Toolbar nativo Android
    },
    ios: {
      showsMyLocationButton: true,
      showsUserLocation: true,
      showsCompass: true,     // Brújula iOS
    }
  }
}
```

### **Diferencias por Plataforma:**
| Feature | Android | iOS |
|---------|---------|-----|
| Provider | Google Maps | Apple Maps |
| API Key | Requerida | No necesaria |
| Toolbar | Sí | No disponible |
| Compass | Automático | Configurable |

---

## 📍 **Configuración GPS/Location (Líneas 39-73)**

### **Parámetros Generales:**
```javascript
location: {
  accuracy: {
    android: 'balanced',  // Balance batería/precisión
    ios: 'best'          // Máxima precisión iOS
  },
  
  timeout: 20000,        // 20 segundos máximo
  maximumAge: 10000,     // Cache de 10 segundos
  distanceFilter: 10,    // Actualizar cada 10 metros
```

### **Configuración Android Específica:**
```javascript
android: {
  enableHighAccuracy: true,
  distanceFilter: 5,         // Más sensible: 5 metros
  fastestInterval: 5000,     // Mínimo 5 segundos entre updates
  interval: 10000,           // Update cada 10 segundos
  maxWaitTime: 15000,        // Máximo 15 segundos de espera
  showLocationDialog: true,  // Dialog de activación GPS
  forceRequestLocation: true // Forzar solicitud
}
```

### **Configuración iOS Específica:**
```javascript
ios: {
  enableHighAccuracy: true,
  distanceFilter: 5,      // 5 metros
  timeInterval: 5000      // Cada 5 segundos
}
```

### **¿Por qué diferentes configuraciones?**
- **Android**: Más opciones de control fino
- **iOS**: Gestión más automatizada del OS
- **Batería**: Android permite balance explícito
- **Precisión**: iOS asume alta precisión por defecto

---

## ⏱️ **Timeouts y Reintentos (Líneas 75-122)**

### **Android - Más Tolerante:**
```javascript
android: {
  config: {
    timeout: 90000,       // 90 segundos (redes lentas)
    maxRetries: 5,        // 5 reintentos
    retryDelay: 1000,     // 1 segundo entre reintentos
    
    fetchOptions: {
      cache: 'no-cache',  // Sin caché (datos frescos)
      credentials: 'same-origin',
      mode: 'cors'
    }
  }
}
```

### **iOS - Más Estricto:**
```javascript
ios: {
  config: {
    timeout: 30000,       // 30 segundos
    maxRetries: 3,        // 3 reintentos
    retryDelay: 2000,     // 2 segundos entre reintentos
    
    fetchOptions: {
      cache: 'default',   // Caché permitido
      credentials: 'same-origin',
      mode: 'cors'
    }
  }
}
```

### **Razones de las Diferencias:**
| Aspecto | Android | iOS | Razón |
|---------|---------|-----|-------|
| Timeout | 90s | 30s | Android: redes más variables |
| Retries | 5 | 3 | Android: más problemas de conectividad |
| Cache | No | Sí | iOS: mejor gestión de caché |
| Delay | 1s | 2s | iOS: evitar saturación |

---

## 🌐 **Detección de URL Dinámica (Líneas 125-138)**

### **Función detectTunnelUrl:**
```javascript
function detectTunnelUrl() {
  try {
    // Móviles siempre usan Heroku
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return BACKEND_URL;
    }
    
    // Web también usa Heroku
    return BACKEND_URL;
  } catch (error) {
    return BACKEND_URL;
  }
}
```

### **Histórico de Evolución:**
1. **v1**: Detectaba túnel Expo automáticamente
2. **v2**: URLs hardcodeadas por plataforma
3. **v3 (actual)**: Heroku como estándar para todo

### **¿Por qué siempre Heroku?**
- **Simplicidad**: Una sola URL para todos
- **Estabilidad**: No depende de servidor local
- **Producción**: Ready para deployment
- **4G/WiFi**: Funciona en cualquier red

---

## 🗺️ **Configuración de Mapas Exportada (Líneas 155-166)**

### **mapConfig Object:**
```javascript
export const mapConfig = {
  provider: Platform.OS === 'android' ? 'google' : 'apple',
  apiKey: Platform.OS === 'android' ? 'AIzaSy...' : null,
  showsUserLocation: true,
  showsMyLocationButton: true,
  toolbarEnabled: Platform.OS === 'android',
  showsCompass: true,
  rotateEnabled: true,
  scrollEnabled: true,
  zoomEnabled: true,
  zoomControlEnabled: true,
};
```

### **Uso en Componentes:**
```javascript
import { mapConfig } from '../services/platform-config';

<MapView
  {...mapConfig}
  style={styles.map}
  initialRegion={region}
/>
```

---

## 🔧 **Funciones Helper Exportadas**

### **1. getApiBaseUrl() - Líneas 169-179:**
```javascript
export const getApiBaseUrl = () => {
  const tunnelUrl = detectTunnelUrl();
  if (tunnelUrl) return tunnelUrl;
  
  const config = getPlatformConfig('config');
  return config.apiUrl;
};
```
- **Propósito**: Obtener URL de API correcta
- **Prioridad**: Túnel → Config plataforma → Fallback

### **2. getFetchOptions() - Líneas 185-191:**
```javascript
export const getFetchOptions = (customOptions = {}) => {
  const config = getPlatformConfig(Platform.OS);
  return {
    ...config.config.fetchOptions,
    ...customOptions  // Override con opciones custom
  };
};
```
- **Propósito**: Opciones optimizadas para fetch
- **Merge**: Combina defaults con custom

### **3. getTimeout() - Líneas 194-197:**
```javascript
export const getTimeout = () => {
  const config = getPlatformConfig(Platform.OS);
  return config.config.timeout;
};
```
- **Android**: 90000ms (90 segundos)
- **iOS**: 30000ms (30 segundos)

### **4. getPlatformOptions() - Líneas 147-152:**
```javascript
export const getPlatformOptions = (section) => {
  const config = getPlatformConfig(section);
  if (!config.options) return {};
  
  return config.options[Platform.OS] || {};
};
```
- **Propósito**: Obtener opciones específicas
- **Ejemplo**: `getPlatformOptions('location')`

---

## 🚨 **API Key Hardcodeada**

### **Problema Actual:**
```javascript
googleMapsApiKey: 'AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw',
```

### **Solución Recomendada:**
```javascript
import { GOOGLE_MAPS_API_KEY } from '@env';

googleMapsApiKey: GOOGLE_MAPS_API_KEY || 'fallback-key',
```

### **Restricciones Necesarias:**
1. Google Cloud Console → API & Services
2. Restringir a:
   - Android: Package name `com.managetime.app`
   - iOS: Bundle ID `com.managetime.app`
3. Limitar APIs: Maps SDK Android/iOS

---

## 📊 **Tabla Comparativa de Configuraciones**

| Feature | Android | iOS | Web |
|---------|---------|-----|-----|
| Maps Provider | Google | Apple | Google |
| GPS Accuracy | Balanced | Best | N/A |
| Timeout | 90s | 30s | 30s |
| Max Retries | 5 | 3 | 3 |
| Distance Filter | 5m | 5m | N/A |
| Cache Policy | No cache | Default | Default |
| Location Dialog | Yes | Auto | N/A |

---

## 🔄 **Flujo de Detección de Entorno**

```
App Start
    ↓
Platform.OS check
    ↓
iOS/Android → Use BACKEND_URL (Heroku)
    ↓
Web → Use BACKEND_URL (Heroku)
    ↓
Apply platform-specific configs
    ↓
Return optimized settings
```

---

## 💡 **Mejores Prácticas**

### **1. Variables de Entorno:**
```javascript
// .env
API_URL=https://managetime-backend.herokuapp.com
GOOGLE_MAPS_KEY=AIza...
```

### **2. Importación en Componentes:**
```javascript
import { getApiUrl, mapConfig, getTimeout } from '../services/platform-config';
```

### **3. Override de Configuraciones:**
```javascript
const customOptions = getFetchOptions({
  headers: { 'Custom-Header': 'value' }
});
```

---

## 📝 **Notas Importantes**

- **Heroku por defecto**: Simplifica deployment
- **API Key expuesta**: Mover a .env en producción
- **Timeouts largos Android**: Por redes variables
- **No más detección túnel**: Simplificado a Heroku
- **GPS más agresivo Android**: Por fragmentación

Este archivo es **crítico para la compatibilidad cross-platform** y debe mantenerse sincronizado con las necesidades de cada plataforma.
