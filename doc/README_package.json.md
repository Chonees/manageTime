# README: package.json - Configuración de Dependencias Frontend

## 📋 **¿Qué es este archivo?**

`package.json` es el **manifiesto principal** del frontend de ManageTime. Define las dependencias, scripts de ejecución, metadatos del proyecto y configuración para Expo SDK 52. Es el archivo que npm/yarn usa para instalar paquetes y gestionar el proyecto React Native/Expo.

## 🎯 **Propósito**
- Definir todas las dependencias del frontend
- Configurar scripts de desarrollo y build
- Especificar versión de Expo SDK (52.0.0)
- Establecer compatibilidad de versiones
- Configurar comandos especiales (túnel, web)
- Mantener consistencia del entorno

## ⚡ **¿Cómo funciona?**

NPM/Yarn lee este archivo para:
1. **Instalar dependencias** exactas especificadas
2. **Ejecutar scripts** definidos (`npm start`, etc.)
3. **Resolver versiones** compatibles entre paquetes
4. **Configurar Expo** con la SDK correcta
5. **Mantener lock file** para reproducibilidad

---

## 📖 **Explicación Sección por Sección**

### **Líneas 2-4: Metadatos del Proyecto**
```json
{
  "name": "app-task",
  "version": "1.0.0",
  "main": "index.js",
```
- **`name`**: Identificador del proyecto (no spaces)
- **`version`**: Versión semántica del app
- **`main`**: Punto de entrada (index.js → App.js)

### **Líneas 5-11: Scripts de Ejecución**
```json
"scripts": {
  "start": "expo start",
  "tunnel": "expo start --tunnel --lan --port 19000",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web"
}
```
- **`start`**: Inicia Expo en modo desarrollo normal
- **`tunnel`**: **CRÍTICO** - Modo túnel para 4G/remoto
- **`android`**: Build nativo Android (requiere Android Studio)
- **`ios`**: Build nativo iOS (requiere Xcode/Mac)
- **`web`**: Versión web con React Native Web

#### **Script Túnel Especial:**
```bash
npm run tunnel
# Equivale a: expo start --tunnel --lan --port 19000
```
- **--tunnel**: Crea túnel público vía ngrok
- **--lan**: También disponible en red local
- **--port 19000**: Puerto fijo para consistencia

---

## 📦 **Dependencias Core de Expo**

### **Líneas 13-14: Runtime y Túnel**
```json
"@expo/metro-runtime": "~4.0.1",
"@expo/ngrok": "^4.1.0",
```
- **metro-runtime**: Bundler de JavaScript para React Native
- **ngrok**: Túneles seguros para desarrollo remoto

### **Línea 24: Expo SDK Principal**
```json
"expo": "~52.0.0",
```
- **VERSION CRÍTICA**: SDK 52 para compatibilidad
- **Tilde (~)**: Permite patch updates (52.0.x)

### **Líneas 26-31: Servicios Expo**
```json
"expo-av": "~15.0.2",              // Audio/Video
"expo-background-fetch": "^13.0.6", // Tareas en background
"expo-dev-client": "~5.0.19",      // Cliente desarrollo
"expo-haptics": "~14.0.1",         // Vibración táctil
"expo-location": "~18.0.10",       // GPS/Ubicación
"expo-task-manager": "^12.0.6",    // Tareas background
```
- **expo-location**: **CRÍTICO** para tracking GPS
- **expo-task-manager**: Para tracking en background

---

## 🧭 **Navegación y UI**

### **Líneas 19-21: React Navigation**
```json
"@react-navigation/native": "^7.0.15",
"@react-navigation/native-stack": "^7.2.1",
"@react-navigation/stack": "^7.1.2",
```
- **v7**: Última versión estable
- **native-stack**: Navegación nativa performante
- **stack**: Navegación JavaScript fallback

### **Líneas 40-44: Componentes UI**
```json
"react-native-gesture-handler": "~2.20.2",
"react-native-maps": "1.18.0",
"react-native-modal-datetime-picker": "^18.0.0",
"react-native-safe-area-context": "4.12.0",
"react-native-screens": "~4.4.0",
```
- **maps**: **CRÍTICO** - Mapas Google/Apple
- **gesture-handler**: Gestos táctiles avanzados
- **safe-area**: Manejo de notch/islands

---

## 🗄️ **Almacenamiento y Datos**

### **Líneas 16, 34: Persistencia**
```json
"@react-native-async-storage/async-storage": "^1.23.1",
"mongodb": "^6.15.0",
```
- **AsyncStorage**: Persistencia local key-value
- **mongodb**: Driver directo MongoDB (¿no usado?)

---

## ⚛️ **React y React Native**

### **Líneas 36-38: Versiones Core**
```json
"react": "18.2.0",
"react-dom": "18.2.0",
"react-native": "0.73.6",
```
- **React 18.2.0**: Compatible con Expo SDK 52
- **RN 0.73.6**: Versión específica para SDK 52
- **NO ACTUALIZAR**: Sin verificar compatibilidad Expo

---

## 🔧 **DevDependencies**

### **Líneas 50-53: Herramientas Desarrollo**
```json
"@babel/core": "^7.20.0",
"babel-preset-expo": "^12.0.10",
"react-native-dotenv": "^3.4.11",
"react-native-reanimated": "~3.16.1"
```
- **Babel**: Transpilación JavaScript
- **dotenv**: Variables de entorno (.env)
- **reanimated**: Animaciones 60 FPS

---

## 📊 **Dependencias Especiales**

### **Funcionalidades Específicas:**
```json
"date-fns": "^4.1.0",           // Manejo de fechas
"polyline-encoded": "^0.0.9",   // Rutas en mapas
"jimp": "^1.6.0",               // Procesamiento imágenes
"react-native-sound": "^0.11.2", // Reproducción audio
"repomix": "^1.1.0"             // Herramienta análisis
```

---

## 🔄 **Comandos de Instalación**

### **Instalación Inicial:**
```bash
# Instalar todas las dependencias
npm install

# O con yarn
yarn install

# Limpiar caché si hay problemas
npx expo start --clear
```

### **Agregar Nueva Dependencia:**
```bash
# Con versión exacta para Expo
npx expo install nombre-paquete

# NO usar npm install directamente
# Expo install garantiza compatibilidad
```

---

## 🚨 **Versiones Críticas y Compatibilidad**

### **Tabla de Compatibilidad Expo SDK 52:**
| Paquete | Versión Requerida | Nota |
|---------|------------------|------|
| expo | ~52.0.0 | Base SDK |
| react | 18.2.0 | NO actualizar |
| react-native | 0.73.6 | Específica para SDK 52 |
| expo-location | ~18.0.10 | GPS crítico |
| react-native-maps | 1.18.0 | Versión exacta |

### **Reglas de Versionado:**
- **~** (tilde): Permite patch updates (1.2.x)
- **^** (caret): Permite minor updates (1.x.x)
- **Exacta**: Sin prefijo (1.2.3)

---

## 🐛 **Problemas Comunes y Soluciones**

### **Error: "Unable to resolve module"**
```bash
# Solución 1: Limpiar caché
npx expo start --clear

# Solución 2: Reinstalar
rm -rf node_modules
npm install
```

### **Error: "Version mismatch"**
```bash
# Usar expo install para compatibilidad
npx expo install [paquete]

# Verificar versiones
npx expo doctor
```

### **Error: "Metro bundler crashed"**
```bash
# Reset completo
watchman watch-del-all
rm -rf node_modules
rm package-lock.json
npm install
npx expo start --clear
```

---

## 🔐 **Configuración de Entorno**

### **Variables de Entorno (.env):**
```env
# Requeridas por react-native-dotenv
API_URL=https://managetime-backend.herokuapp.com/api
GOOGLE_MAPS_API_KEY=AIza...
```

### **Babel Config para .env:**
```javascript
// babel.config.js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }]
  ]
};
```

---

## 📱 **Scripts de Desarrollo Recomendados**

### **Desarrollo Local:**
```bash
npm start
# Escanear QR con Expo Go
```

### **Desarrollo Remoto/4G:**
```bash
npm run tunnel
# URL pública para cualquier dispositivo
```

### **Build Producción:**
```bash
# Build con EAS
eas build --platform all

# O builds locales
npx expo run:android --variant release
npx expo run:ios --configuration Release
```

---

## 📝 **Notas Importantes**

- **Expo SDK 52**: NO actualizar sin verificar compatibilidad total
- **React Native 0.73.6**: Versión específica, no cambiar
- **Túnel script**: Crítico para desarrollo remoto/4G
- **MongoDB driver**: Incluido pero probablemente no usado (backend)
- **Lock file**: Commitear package-lock.json para consistencia

Este archivo es **fundamental para el entorno de desarrollo** y cambios incorrectos pueden romper la aplicación completamente.
