# README: src/screens/DashboardScreen.js - Pantalla Principal del Dashboard

## 📋 **¿Qué es este archivo?**

`DashboardScreen.js` es la **pantalla principal** de la aplicación ManageTime después del login. Es el centro de comando donde los usuarios ven sus tareas pendientes, gestionan su disponibilidad laboral, acceden a todas las funciones principales y visualizan su ubicación actual. Incluye actualización automática en tiempo real de tareas y ubicación.

## 🎯 **Propósito**
- Mostrar panel principal con información del usuario
- Gestionar disponibilidad laboral (Disponible/No disponible)
- Listar tareas pendientes con actualización automática
- Mostrar ubicación actual en mapa
- Proporcionar acceso rápido a todas las funciones
- Actualizar ubicación al servidor cada 10 segundos
- Refrescar tareas automáticamente cada 15 segundos
- Manejar navegación a otras pantallas

## ⚡ **¿Cómo funciona?**

El Dashboard actúa como **hub central** de la aplicación:
1. **Carga datos iniciales** (tareas, ubicación)
2. **Inicia actualizaciones automáticas** (ubicación cada 10s, tareas cada 15s)
3. **Muestra estado de disponibilidad** con contador de tiempo
4. **Lista tareas pendientes** con navegación a detalles
5. **Envía ubicación** al servidor en tiempo real
6. **Proporciona accesos directos** a funciones principales

---

## 📖 **Explicación Línea por Línea**

### **Líneas 1-23: Importaciones**
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, RefreshControl, Dimensions, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LocationComponent from '../components/LocationComponent';
import * as api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { startLocationMonitoring, stopLocationMonitoring } from '../services/location-service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
```
- **React Native Core:** Componentes UI básicos
- **Contexts:** Auth, Language, Theme para estado global
- **LocationComponent:** Manejo de GPS y mapas
- **API:** Comunicación con backend
- **date-fns:** Formateo de fechas en español

### **Línea 26: Dimensiones Responsive**
```javascript
const { width, height } = Dimensions.get('window');
```
- **Obtiene dimensiones** de pantalla para diseño adaptativo
- **Usado para:** Cálculos de tamaño responsive

### **Líneas 28-45: Estado del Componente**
```javascript
const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskLocation, setSelectedTaskLocation] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const theme = useTheme();
  
  // Referencias
  const mapRef = useRef(null);
  const locationUpdateIntervalRef = useRef(null);
  const tasksUpdateIntervalRef = useRef(null);
```
- **Hooks de contexto:** Usuario, idioma, tema
- **Estados locales:** Carga, errores, tareas, ubicación
- **Referencias:** Para intervalos y componentes

---

## 🔄 **Ciclo de Vida y Actualizaciones**

### **Líneas 48-66: useEffect Principal**
```javascript
useEffect(() => {
  loadDashboardData();
  
  // Iniciar actualización de la ubicación cada 10 segundos
  startLocationUpdates();
  
  // Iniciar actualización automática de tareas cada 15 segundos
  startTasksAutoUpdate();
  
  // Limpiar los intervalos al desmontar
  return () => {
    if (locationUpdateIntervalRef.current) {
      clearInterval(locationUpdateIntervalRef.current);
    }
    if (tasksUpdateIntervalRef.current) {
      clearInterval(tasksUpdateIntervalRef.current);
    }
  };
}, []);
```
- **Carga inicial** de datos del dashboard
- **Inicia intervalos** de actualización automática
- **Limpieza:** Cancela intervalos al salir

### **Líneas 69-85: Actualización de Tareas sin Loading**
```javascript
const fetchLatestTasks = async () => {
  try {
    console.log('📥 Solicitando tareas actualizadas del servidor...');
    const userTasks = await api.getUserTasks();
    console.log(`📋 Tareas recibidas del servidor: ${userTasks.length}`);
    
    // Filtrar tareas pendientes
    const pendingTasks = userTasks.filter(task => !task.completed);
    console.log(`📋 Tareas pendientes filtradas: ${pendingTasks.length}`);
    
    // Actualizar siempre para reflejar cambios
    console.log('🔄 Actualizando lista de tareas en pantalla');
    setTasks(pendingTasks);
  } catch (error) {
    console.error('❌ Error obteniendo tareas actualizadas:', error);
  }
};
```
- **Sin indicador de carga:** Para actualizaciones silenciosas
- **Filtro automático:** Solo tareas no completadas
- **Logging detallado:** Con emojis para debugging

---

## 📍 **Sistema de Ubicación en Tiempo Real**

### **Líneas 114-126: Iniciar Actualizaciones de Ubicación**
```javascript
const startLocationUpdates = () => {
  // Limpiar cualquier intervalo existente
  if (locationUpdateIntervalRef.current) {
    clearInterval(locationUpdateIntervalRef.current);
  }
  
  // Nuevo intervalo cada 10 segundos
  locationUpdateIntervalRef.current = setInterval(() => {
    if (position) {
      sendLocationUpdate(position);
    }
  }, 10000); // 10 segundos
};
```
- **Intervalo de 10 segundos:** Para tracking en tiempo real
- **Limpieza previa:** Evita intervalos duplicados
- **Condicional:** Solo envía si hay posición válida

### **Líneas 129-148: Envío de Ubicación al Servidor**
```javascript
const sendLocationUpdate = async (coords) => {
  try {
    if (!coords || !coords.latitude || !coords.longitude) {
      return; // No enviar si no hay coordenadas válidas
    }
    
    const location = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: new Date().toISOString(),
      type: 'tracking' // Compatibilidad con backend
    };
    
    await api.saveLocations([location]);
    console.log('Ubicación enviada al servidor:', JSON.stringify(location));
  } catch (error) {
    console.error('Error al enviar ubicación:', error);
  }
};
```
- **Validación:** Verifica coordenadas antes de enviar
- **Tipo 'tracking':** Para compatibilidad con backend
- **Timestamp ISO:** Formato estándar de fecha
- **Array de locations:** API espera array aunque sea una

---

## 🎨 **Componentes UI Principales**

### **1. Header con Info de Usuario**
```javascript
<View style={styles.header}>
  <Text style={styles.userName}>Hola, {user?.username || 'Usuario'}</Text>
  <Text style={styles.userRole}>{user?.isAdmin ? 'Administrador' : 'Empleado'}</Text>
</View>
```

### **2. Botón de Disponibilidad**
```javascript
<TouchableOpacity 
  style={[styles.availabilityButton, isAvailable && styles.availableButton]}
  onPress={toggleAvailability}
>
  <Ionicons 
    name={isAvailable ? "stop-circle" : "play-circle"} 
    size={24} 
    color="white" 
  />
  <Text style={styles.buttonText}>
    {isAvailable ? t('endWork') : t('startWork')}
  </Text>
</TouchableOpacity>
```

### **3. Contador de Tiempo Disponible**
```javascript
{isAvailable && workStartTime && (
  <View style={styles.timerContainer}>
    <Text style={styles.timerText}>
      {t('workingSince')}: {formatDistanceToNow(workStartTime, { locale: es })}
    </Text>
  </View>
)}
```

### **4. Lista de Tareas Pendientes**
```javascript
<ScrollView 
  style={styles.tasksContainer}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={['#fff3e5']}
    />
  }
>
  {tasks.map(task => (
    <TaskCard key={task._id} task={task} onPress={() => navigateToTask(task)} />
  ))}
</ScrollView>
```

### **5. Mapa de Ubicación**
```javascript
<LocationComponent
  ref={mapRef}
  onPositionUpdate={handlePositionUpdate}
  selectedTaskLocation={selectedTaskLocation}
  style={styles.map}
/>
```

---

## 🔄 **Flujo de Disponibilidad Laboral**

```javascript
const toggleAvailability = async () => {
  try {
    if (isAvailable) {
      // Detener disponibilidad
      const duration = Date.now() - workStartTime;
      await api.saveActivity({
        type: 'clock_out',
        description: 'No disponible',
        metadata: {
          duration: Math.floor(duration / 1000), // segundos
          coordinates: position
        }
      });
      setIsAvailable(false);
      setWorkStartTime(null);
    } else {
      // Iniciar disponibilidad
      await api.saveActivity({
        type: 'clock_in',
        description: 'Disponible',
        metadata: {
          coordinates: position
        }
      });
      setIsAvailable(true);
      setWorkStartTime(Date.now());
    }
  } catch (error) {
    Alert.alert('Error', t('errorChangingAvailability'));
  }
};
```

---

## 📊 **Actualización Automática de Tareas**

```javascript
const startTasksAutoUpdate = () => {
  // Limpiar intervalo existente
  if (tasksUpdateIntervalRef.current) {
    clearInterval(tasksUpdateIntervalRef.current);
  }
  
  // Actualizar cada 15 segundos
  tasksUpdateIntervalRef.current = setInterval(() => {
    fetchLatestTasks();
  }, 15000);
};
```

---

## 🧭 **Navegación a Otras Pantallas**

```javascript
// Navegación con datos
const navigateToTask = (task) => {
  navigation.navigate('TaskDetails', { taskId: task._id });
};

// Accesos directos
const quickActions = [
  { 
    icon: 'add-circle', 
    label: t('createTask'), 
    onPress: () => navigation.navigate('CreateTask') 
  },
  { 
    icon: 'location', 
    label: t('locationHistory'), 
    onPress: () => navigation.navigate('LocationHistory') 
  },
  { 
    icon: 'mic', 
    label: t('voiceAssistant'), 
    onPress: () => navigation.navigate('VoiceAssistant') 
  },
  { 
    icon: 'people', 
    label: t('adminPanel'), 
    onPress: () => navigation.navigate('AdminPanel'),
    visible: user?.isAdmin 
  }
];
```

---

## 🎨 **Estilos Principales**

```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2e2e2e',
    padding: 20,
    paddingTop: StatusBar.currentHeight + 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  availabilityButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  availableButton: {
    backgroundColor: '#FF6B6B',
  },
  tasksContainer: {
    flex: 1,
    padding: 15,
  },
  taskCard: {
    backgroundColor: '#2e2e2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#fff3e5',
  },
  map: {
    height: 200,
    margin: 15,
    borderRadius: 10,
    overflow: 'hidden',
  }
});
```

---

## 🔄 **Pull to Refresh**

```javascript
const onRefresh = async () => {
  setRefreshing(true);
  await loadDashboardData(false); // Sin mostrar loading
  setRefreshing(false);
};
```

---

## 📱 **Características Responsive**

- **StatusBar aware:** Padding dinámico según plataforma
- **ScrollView:** Para pantallas pequeñas
- **Dimensions API:** Cálculos basados en tamaño de pantalla
- **Flexbox:** Layout adaptativo

---

## 🚨 **Manejo de Errores**

```javascript
try {
  // Operaciones críticas
} catch (error) {
  console.error('Error específico:', error);
  Alert.alert(
    t('error'),
    t('errorMessage'),
    [{ text: t('ok'), style: 'cancel' }]
  );
}
```

---

## 🔧 **Optimizaciones de Rendimiento**

1. **Referencias para intervalos:** Evita memory leaks
2. **Actualización selectiva:** Solo tareas pendientes
3. **Fetch silencioso:** Sin loading para auto-refresh
4. **Cleanup en unmount:** Cancela intervalos
5. **Validación de datos:** Antes de enviar al servidor

---

## 📝 **Notas Importantes**

- **Intervalos críticos:** 10s para ubicación, 15s para tareas
- **Tipo 'tracking':** Para compatibilidad con backend
- **Estados asíncronos:** Manejados con async/await
- **Logging con emojis:** Facilita debugging en desarrollo
- **Cleanup obligatorio:** Para evitar memory leaks

Este componente es el **núcleo de la experiencia del usuario** y debe mantener sincronización constante con el servidor.
