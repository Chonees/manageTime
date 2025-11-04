# README: app.json - Configuración Principal de Expo

## 📋 **¿Qué es este archivo?**

`app.json` es el **archivo de configuración principal** para la aplicación Expo/React Native ManageTime. Define metadatos de la app, configuraciones específicas de plataforma (iOS/Android), permisos, plugins, colores del tema, y todas las configuraciones necesarias para compilar y publicar la aplicación en las tiendas.

## 🎯 **Propósito**
- Definir metadatos de la aplicación (nombre, versión, iconos)
- Configurar permisos de plataforma (GPS, notificaciones)
- Establecer identificadores únicos para stores
- Configurar API keys (Google Maps)
- Definir splash screen y colores del tema
- Especificar plugins de Expo necesarios
- Configurar el empaquetador Metro

## ⚡ **¿Cómo funciona?**

Expo lee este archivo para:
1. **Configurar la app** durante desarrollo
2. **Generar builds nativos** con configuraciones correctas
3. **Establecer permisos** en manifiestos Android/iOS
4. **Inyectar API keys** en tiempo de compilación
5. **Definir apariencia** (splash, iconos, colores)

---

## 📖 **Explicación Sección por Sección**

### **Líneas 3-11: Configuración General**
```json
{
  "expo": {
    "name": "Workproof",
    "slug": "manage-time",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "backgroundColor": "#282828",
    "primaryColor": "#fff3e5",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
```
- **`name`**: "Workproof" - Nombre que ve el usuario
- **`slug`**: "manage-time" - Identificador URL-safe
- **`version`**: "1.0.0" - Versión semántica
- **`orientation`**: "portrait" - Solo vertical
- **`icon`**: Icono principal de la app
- **`backgroundColor`**: #282828 - Gris oscuro del tema
- **`primaryColor`**: #fff3e5 - Crema claro del tema
- **`newArchEnabled`**: true - Nueva arquitectura React Native

### **Líneas 12-16: Splash Screen**
```json
"splash": {
  "image": "./assets/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#282828"
}
```
- **`image`**: Logo mostrado al iniciar
- **`resizeMode`**: "contain" - Ajusta sin recortar
- **`backgroundColor`**: Mismo gris oscuro para consistencia

---

## 📱 **Configuración iOS (Líneas 17-21)**

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.managetime.app",
  "buildNumber": "1"
}
```
- **`supportsTablet`**: true - Compatible con iPad
- **`bundleIdentifier`**: ID único para App Store
- **`buildNumber`**: Versión interna de build

### **Requisitos App Store:**
- Bundle ID debe ser único globalmente
- Formato reverse-domain (com.empresa.app)
- No se puede cambiar después de publicar

---

## 🤖 **Configuración Android (Líneas 22-40)**

### **Adaptive Icon (Líneas 23-26):**
```json
"adaptiveIcon": {
  "foregroundImage": "./assets/icon.png",
  "backgroundColor": "#282828"
}
```
- **Iconos adaptativos**: Android 8.0+
- **Foreground**: Logo principal
- **Background**: Color de fondo

### **Package y API Keys (Líneas 27-32):**
```json
"package": "com.managetime.app",
"config": {
  "googleMaps": {
    "apiKey": "AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw"
  }
}
```
- **`package`**: ID único para Play Store
- **`apiKey`**: **CRÍTICO** - Google Maps API key
- **SEGURIDAD**: Esta key debería estar en .env

### **Permisos Android (Líneas 33-40):**
```json
"permissions": [
  "ACCESS_COARSE_LOCATION",      // Ubicación aproximada
  "ACCESS_FINE_LOCATION",         // Ubicación precisa
  "ACCESS_BACKGROUND_LOCATION",   // GPS en background
  "FOREGROUND_SERVICE",           // Servicios en primer plano
  "FOREGROUND_SERVICE_LOCATION",  // Servicio GPS foreground
  "WAKE_LOCK"                     // Mantener dispositivo activo
]
```

#### **Permisos Críticos para ManageTime:**
| Permiso | Uso en la App |
|---------|---------------|
| `ACCESS_FINE_LOCATION` | GPS preciso para tracking |
| `ACCESS_BACKGROUND_LOCATION` | Tracking cuando app minimizada |
| `FOREGROUND_SERVICE_LOCATION` | Notificación persistente GPS |
| `WAKE_LOCK` | Evitar suspensión durante tracking |

---

## 🔌 **Plugins de Expo (Líneas 45-52)**

```json
"plugins": [
  [
    "expo-location",
    {
      "locationAlwaysAndWhenInUsePermission": 
        "Permitir a ManageTime acceder a tu ubicación."
    }
  ]
]
```
- **expo-location plugin**: Configura permisos nativos
- **Mensaje personalizado**: Mostrado al usuario
- **Requerido para iOS**: Info.plist permissions

### **¿Por qué plugin?**
- Modifica archivos nativos en tiempo de build
- Añade configuraciones específicas de plataforma
- Necesario para ciertos permisos en iOS

---

## 📦 **Configuración del Empaquetador (Líneas 53-57)**

```json
"packagerOpts": {
  "config": "metro.config.js",
  "sourceExts": ["js", "jsx", "ts", "tsx", "json"],
  "assetExts": ["ttf", "png", "jpg", "jpeg", "mp3", "wav"]
}
```
- **`config`**: Archivo de configuración Metro
- **`sourceExts`**: Extensiones de código fuente
- **`assetExts`**: Tipos de archivos de recursos

### **Extensiones de Assets:**
| Extensión | Tipo | Uso en App |
|-----------|------|------------|
| ttf | Fuentes | Tipografías custom |
| png/jpg | Imágenes | Iconos, logos |
| mp3/wav | Audio | Sonidos notificación |

---

## ⚙️ **Configuración Extra (Líneas 58-60)**

```json
"extra": {
  "excludeBackend": true
}
```
- **Campo personalizado**: Para scripts o configuraciones
- **excludeBackend**: Evita incluir carpeta backend en builds

---

## 🎨 **Esquema de Colores Definido**

```json
{
  "backgroundColor": "#282828",    // Gris oscuro
  "primaryColor": "#fff3e5"        // Crema claro
}
```

### **Aplicación de Colores:**
- **Splash screen**: backgroundColor
- **Status bar**: primaryColor (en algunos casos)
- **Tema general**: Consistencia visual

---

## 🚀 **Configuraciones para Producción**

### **Para App Store (iOS):**
```json
"ios": {
  "bundleIdentifier": "com.managetime.app",
  "buildNumber": "2",           // Incrementar en cada build
  "infoPlist": {
    "NSLocationAlwaysAndWhenInUseUsageDescription": "...",
    "NSLocationWhenInUseUsageDescription": "..."
  }
}
```

### **Para Play Store (Android):**
```json
"android": {
  "package": "com.managetime.app",
  "versionCode": 2,              // Incrementar en cada build
  "googleServicesFile": "./google-services.json"
}
```

---

## 🔐 **Seguridad y Mejores Prácticas**

### **⚠️ API Key Expuesta:**
```json
"apiKey": "AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw"
```
**PROBLEMA**: API key hardcodeada en código
**SOLUCIÓN RECOMENDADA**:
```javascript
// app.config.js
export default {
  expo: {
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    }
  }
};
```

### **Restricciones de API Key:**
1. Ir a Google Cloud Console
2. Restringir key a:
   - Android: Package name específico
   - iOS: Bundle ID específico
3. Limitar APIs habilitadas

---

## 📱 **Identificadores de Aplicación**

### **Estructura Recomendada:**
```
com.[empresa].[app].[ambiente]

Ejemplos:
com.managetime.app         // Producción
com.managetime.app.dev     // Desarrollo
com.managetime.app.staging // Staging
```

### **No se pueden cambiar después de publicar:**
- iOS: bundleIdentifier
- Android: package

---

## 🛠️ **Comandos Relacionados**

```bash
# Validar configuración
npx expo doctor

# Prebuild (generar carpetas nativas)
npx expo prebuild

# Build de desarrollo
eas build --profile development

# Build de producción
eas build --profile production

# Actualizar versión
npm version patch  # 1.0.0 → 1.0.1
```

---

## 📊 **Permisos por Plataforma**

### **iOS (Info.plist):**
- NSLocationAlwaysAndWhenInUseUsageDescription
- NSLocationWhenInUseUsageDescription
- NSMotionUsageDescription (si usa acelerómetro)

### **Android (AndroidManifest.xml):**
- android.permission.ACCESS_FINE_LOCATION
- android.permission.ACCESS_BACKGROUND_LOCATION
- android.permission.FOREGROUND_SERVICE

---

## 🚨 **Errores Comunes**

### **Error: "Invalid bundle identifier"**
- **Causa**: Formato incorrecto o caracteres especiales
- **Solución**: Usar solo letras, números y puntos

### **Error: "Google Maps SDK not found"**
- **Causa**: API key inválida o sin configurar
- **Solución**: Verificar key y restricciones

### **Error: "Permission denied - location"**
- **Causa**: Permisos no configurados correctamente
- **Solución**: Verificar plugins y mensajes de permisos

---

## 📝 **Notas Importantes**

- **API Key expuesta**: Mover a variables de entorno
- **Versioning**: Incrementar buildNumber/versionCode en cada release
- **Bundle IDs**: Definir antes de primer build
- **Permisos GPS**: Críticos para funcionalidad core
- **Nueva arquitectura**: newArchEnabled mejora performance

Este archivo es **fundamental para builds y publicación** y cambios incorrectos pueden romper la compilación.
