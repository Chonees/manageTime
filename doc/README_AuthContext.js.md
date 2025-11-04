# README: src/context/AuthContext.js - Contexto Global de Autenticación

## 📋 **¿Qué es este archivo?**

`AuthContext.js` es el **núcleo del sistema de autenticación** de ManageTime. Implementa un Context Provider de React que gestiona el estado global de autenticación, maneja login/logout/registro, persiste sesiones con AsyncStorage, y coordina el inicio del tracking GPS automático tras el login. Es accesible desde cualquier componente de la aplicación.

## 🎯 **Propósito**
- Gestionar estado global de autenticación
- Manejar login, logout y registro de usuarios
- Persistir sesiones entre reinicios de app
- Verificar tokens automáticamente al iniciar
- Coordinar inicio de tracking GPS post-login
- Proporcionar hook `useAuth()` para acceso global
- Implementar timeout de seguridad para verificación

## ⚡ **¿Cómo funciona?**

El contexto maneja el **flujo completo de autenticación**:
1. **Verificación inicial** de token guardado (máx 5 segundos)
2. **Login/Registro** con validación y manejo de errores
3. **Persistencia** de sesión en AsyncStorage
4. **Emisión de eventos** para iniciar tracking GPS
5. **Logout** con limpieza de datos y flags especiales
6. **Propagación global** del estado de usuario

---

## 📖 **Explicación Línea por Línea**

### **Líneas 1-4: Importaciones Core**
```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';
import { Platform, DeviceEventEmitter } from 'react-native';
```
- **React Context API**: Para estado global
- **AsyncStorage**: Persistencia de datos
- **API service**: Comunicación con backend
- **DeviceEventEmitter**: Eventos nativos para GPS

### **Líneas 7-10: Creación del Contexto**
```javascript
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);
```
- **AuthContext**: Contexto global de autenticación
- **useAuth**: Hook personalizado para acceso fácil
- **Patrón**: Simplifica `useContext(AuthContext)` a `useAuth()`

### **Líneas 13-16: Estado del Provider**
```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
```
- **user**: Objeto del usuario autenticado o null
- **loading**: Estado de carga para UI
- **error**: Mensajes de error para mostrar

---

## ⏱️ **Sistema de Timeout de Seguridad**

### **Líneas 18-46: useEffect de Inicialización**
```javascript
useEffect(() => {
  // Timeout de 5 segundos máximo
  const authTimeout = setTimeout(() => {
    if (loading) {
      console.log('Tiempo de espera agotado para verificación');
      setLoading(false);
      setUser(null);
    }
  }, 5000); // 5 segundos máximo

  const setupAuth = async () => {
    const authResult = await checkAuthentication();
    
    // Si autenticado, iniciar tracking GPS
    if (authResult && authResult.success && user) {
      try {
        console.log('Emitiendo evento para iniciar rastreo');
        DeviceEventEmitter.emit('START_LOCATION_TRACKING');
      } catch (eventError) {
        console.error('Error al emitir evento:', eventError);
      }
    }
  };
  
  setupAuth();
  return () => clearTimeout(authTimeout);
}, []);
```
- **Timeout crítico**: 5 segundos máximo para verificar
- **Evita bloqueos**: Si API no responde, continúa sin auth
- **GPS automático**: Inicia tracking si hay usuario válido
- **Cleanup**: Cancela timeout al desmontar

---

## 🔐 **Verificación de Autenticación**

### **Líneas 49-74: checkAuthentication**
```javascript
const checkAuthentication = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Verificando autenticación...');
    const result = await api.checkToken();
    
    if (result.valid) {
      console.log('Token válido, usuario:', result.user);
      setUser(result.user);
      return { success: true, user: result.user };
    } else {
      console.log('Token inválido o no existe');
      setUser(null);
      return { success: false };
    }
  } catch (error) {
    console.error('Error al verificar:', error);
    setUser(null);
    setError('Error al verificar la autenticación');
    return { success: false, error: error.message };
  } finally {
    setLoading(false);
  }
};
```
- **Verifica token JWT**: Guardado en AsyncStorage
- **Actualiza estado**: user o null según validez
- **Manejo robusto**: Try-catch-finally para errores
- **Return consistente**: Siempre retorna objeto con success

---

## 🔑 **Función de Login**

### **Líneas 77-112: login**
```javascript
const login = async (username, password) => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Intentando login para:', username);
    const result = await api.login(username, password);
    
    if (!result || !result.success) {
      const errorMessage = result?.error || 'Error al iniciar sesión';
      console.log('Login fallido:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
    
    console.log('Login exitoso, usuario:', result.user?.username);
    setUser(result.user);
    
    // Iniciar tracking GPS automáticamente
    try {
      console.log('Emitiendo evento para iniciar rastreo');
      DeviceEventEmitter.emit('START_LOCATION_TRACKING');
    } catch (eventError) {
      console.error('Error al emitir evento:', eventError);
    }
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error inesperado:', error);
    const errorMessage = error.message || 'Error inesperado';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
};
```
- **Validación completa**: Verifica resultado antes de usar
- **GPS automático**: Inicia tracking tras login exitoso
- **Manejo de errores**: Múltiples niveles de catch
- **Finally crucial**: SIEMPRE establece loading = false

### **Evento GPS Post-Login:**
```javascript
DeviceEventEmitter.emit('START_LOCATION_TRACKING');
```
- **Evento nativo**: Se propaga a LocationTrackingContext
- **Try-catch interno**: No bloquea login si falla GPS
- **Automático**: Usuario no necesita activar manualmente

---

## 📝 **Función de Registro**

### **Líneas 115-132: register**
```javascript
const register = async (username, password, email) => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Intentando registrar:', username);
    const result = await api.register(username, password, email);
    
    console.log('Registro exitoso');
    return { success: true };
  } catch (error) {
    console.error('Error al registrarse:', error);
    setError(error.message || 'Error al registrarse');
    return { success: false, error: error.message };
  } finally {
    setLoading(false);
  }
};
```
- **No auto-login**: Usuario debe hacer login después
- **Validación backend**: Email único, password hash
- **Return simple**: Solo success/error, sin user

---

## 🚪 **Función de Logout**

### **Líneas 135-156: logout**
```javascript
const logout = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Cerrando sesión...');
    await api.logout();
    
    // Flag especial para WelcomeScreen
    await AsyncStorage.setItem('isLogout', 'true');
    console.log('Indicador de logout establecido');
    
    console.log('Sesión cerrada correctamente');
    setUser(null);
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    setError(error.message);
    return { success: false, error: error.message };
  } finally {
    setLoading(false);
  }
};
```
- **Flag 'isLogout'**: WelcomeScreen skip automático
- **Limpieza completa**: Token, user, flags
- **API logout**: Notifica al backend
- **GPS stop**: Implícito al limpiar user

### **Flag Especial isLogout:**
```javascript
await AsyncStorage.setItem('isLogout', 'true');
```
- **Propósito**: Skip WelcomeScreen tras logout
- **Consumido por**: WelcomeScreen en su useEffect
- **Se limpia**: En próximo login exitoso

---

## 🎣 **Hook useAuth - Uso en Componentes**

### **Ejemplo de Uso:**
```javascript
// En cualquier componente
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, login, logout, loading, error } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  
  return (
    <View>
      <Text>Bienvenido {user.username}</Text>
      <Button onPress={logout} title="Cerrar sesión" />
    </View>
  );
};
```

---

## 🔄 **Flujo Completo de Autenticación**

```
APP START
    ↓
AuthProvider monta
    ↓
checkAuthentication() [máx 5 segundos]
    ├─→ Token válido → setUser() → START_LOCATION_TRACKING
    └─→ Token inválido → setUser(null)
    ↓
App Navigator decide pantalla
    ├─→ user existe → Dashboard
    └─→ user null → Login

LOGIN FLOW:
Usuario → login(username, password)
    ↓
API call → JWT token
    ↓
AsyncStorage.setItem('token')
    ↓
setUser(userData)
    ↓
DeviceEventEmitter.emit('START_LOCATION_TRACKING')
    ↓
Navigate to Dashboard
```

---

## 📊 **Provider Value - Datos Expuestos**

```javascript
<AuthContext.Provider value={{
  user,           // Objeto usuario o null
  loading,        // Boolean estado de carga
  error,          // String mensaje de error
  login,          // Función async (username, password)
  logout,         // Función async ()
  register,       // Función async (username, password, email)
  checkAuthentication // Función async ()
}}>
  {children}
</AuthContext.Provider>
```

---

## 🚨 **Manejo de Errores y Edge Cases**

### **Timeout de Verificación:**
- **Problema**: API no responde al verificar token
- **Solución**: Timeout 5 segundos, continúa sin auth
- **UX**: Evita pantalla de carga infinita

### **GPS Event Failures:**
- **Problema**: LocationContext no está listo
- **Solución**: Try-catch alrededor de emit
- **UX**: Login exitoso aunque GPS falle

### **Loading State Lock:**
- **Problema**: Loading queda true por error
- **Solución**: Finally block SIEMPRE setLoading(false)
- **UX**: UI nunca queda bloqueada

---

## 🔧 **Integración con Otros Contextos**

```javascript
// Orden en App.js
<AuthProvider>
  <LocationTrackingProvider>  // Escucha START_LOCATION_TRACKING
    <LanguageProvider>
      <NavigationContainer>
        <AppNavigator />       // Usa user para decidir rutas
      </NavigationContainer>
    </LanguageProvider>
  </LocationTrackingProvider>
</AuthProvider>
```

---

## 📝 **Notas Importantes**

- **Timeout crítico**: 5 segundos previene bloqueos
- **DeviceEventEmitter**: Para comunicación con GPS
- **Flag isLogout**: Comportamiento especial en WelcomeScreen
- **Finally blocks**: Críticos para evitar UI bloqueada
- **Logging extensivo**: Para debugging en desarrollo

Este contexto es **fundamental para toda la aplicación** y coordina autenticación, navegación y servicios de ubicación.
