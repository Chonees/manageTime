# README: src/components/LocationComponent.js - Componente de Ubicación GPS y Mapas

## 📋 **¿Qué es este archivo?**

`LocationComponent.js` es el **componente central de geolocalización** en ManageTime. Gestiona permisos de ubicación, obtiene coordenadas GPS en tiempo real, muestra mapas interactivos con Google Maps/Apple Maps, maneja tracking continuo, y expone métodos para control externo del mapa. Es un componente reutilizable con forwardRef para acceso imperativo.

## 🎯 **Propósito**
- Solicitar y gestionar permisos de ubicación
- Obtener posición GPS actual del dispositivo
- Mostrar mapa interactivo con marcadores
- Tracking continuo de ubicación (watch position)
- Exponer métodos para centrar mapa externamente
- Manejar diferentes configuraciones por plataforma
- Mostrar ubicación de tareas con círculo de radio
- Proporcionar controles de trabajo (opcional)

## ⚡ **¿Cómo funciona?**

El componente **maneja todo el flujo GPS**:
1. **Solicita permisos** al sistema operativo
2. **Obtiene ubicación** inicial con alta precisión
3. **Muestra mapa** con proveedor nativo
4. **Actualiza posición** cada minuto (watch)
5. **Expone métodos** via forwardRef
6. **Maneja errores** con mensajes traducidos

---

## 📖 **Props y Configuración**

### **Props del Componente:**
```javascript
<LocationComponent
  ref={mapRef}
  onLocationChange={(location) => {}}     // Callback cuando cambia ubicación
  showWorkControls={false}                // Mostrar botones trabajo
  mapOnly={false}                         // Solo mapa sin controles
  customHeight={300}                      // Altura personalizada
  transparentContainer={false}            // Container transparente
  taskLocation={{                         // Ubicación de tarea
    coordinates: [lng, lat],
    radius: 2.5
  }}
/>
```

### **forwardRef e Imperative Handle (Líneas 11-48):**
```javascript
const LocationComponent = forwardRef((props, ref) => {
  const mapRef = useRef(null);
  
  useImperativeHandle(ref, () => ({
    // Método expuesto al padre
    centerOnLocation: (latitude, longitude) => {
      if (mapRef.current && latitude && longitude) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,  // Zoom level
          longitudeDelta: 0.005
        }, 1000); // Animación de 1 segundo
      }
    }
  }));
});
```
- **forwardRef**: Permite pasar ref desde padre
- **useImperativeHandle**: Expone métodos específicos
- **centerOnLocation**: Centra mapa en coordenadas
- **Animación suave**: 1000ms de duración

---

## 📍 **Obtención de Ubicación GPS (Líneas 50-119)**

### **Función getLocation:**
```javascript
const getLocation = async () => {
  setLoading(true);
  setErrorMsg(null);
  
  try {
    // 1. Solicitar permisos
    const { status } = await Location.requestForegroundPermissionsAsync();
    const isGranted = status === 'granted';
    setPermissionGranted(isGranted);
    
    if (!isGranted) {
      setErrorMsg(t('locationPermissionRequired'));
      return;
    }
    
    // 2. Verificar servicios GPS habilitados
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      setErrorMsg(t('locationServicesDisabled'));
      return;
    }
    
    // 3. Configuración específica por plataforma
    const locationConfig = getPlatformConfig('location');
    const options = {
      accuracy: Location.Accuracy[
        Platform.OS === 'android' ? 'Balanced' : 'BestForNavigation'
      ],
      timeout: locationConfig.timeout || 20000,      // 20 segundos
      maximumAge: locationConfig.maximumAge || 10000 // Cache 10 segundos
    };
    
    // 4. Obtener posición actual
    const currentLocation = await Location.getCurrentPositionAsync(options);
    
    // 5. Validar datos
    if (!currentLocation?.coords?.latitude || !currentLocation?.coords?.longitude) {
      throw new Error('Invalid location data');
    }
    
    setLocation(currentLocation);
    
    // 6. Callback al padre
    if (onLocationChange) {
      onLocationChange(currentLocation);
    }
    
  } catch (error) {
    console.error('Error getting location:', error);
    setErrorMsg(t('locationError'));
  } finally {
    setLoading(false);
  }
};
```

### **Flujo de Permisos:**
1. **requestForegroundPermissionsAsync**: Solicita permiso
2. **hasServicesEnabledAsync**: Verifica GPS activado
3. **granted/denied**: Manejo de estados

### **Precisión por Plataforma:**
- **Android**: `Balanced` (balance batería/precisión)
- **iOS**: `BestForNavigation` (máxima precisión)

---

## 🔄 **Tracking Continuo (Líneas 121-170)**

### **Setup de Ubicación con Watch:**
```javascript
useEffect(() => {
  let isMounted = true;
  let locationSubscription = null;
  
  const setupLocation = async () => {
    // Obtener ubicación inicial
    await getLocation();
    
    if (!isMounted) return;
    
    if (Platform.OS === 'web') {
      // Web: Polling cada minuto
      const intervalId = setInterval(() => {
        if (isMounted) getLocation();
      }, 60000);
      
      return () => clearInterval(intervalId);
    } else {
      // Native: Watch position API
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,    // Actualizar cada 10 metros
          timeInterval: 60000      // O cada minuto
        },
        (newLocation) => {
          if (isMounted) {
            setLocation(newLocation);
            if (onLocationChange) {
              onLocationChange(newLocation);
            }
          }
        }
      );
    }
  };
  
  setupLocation();
  
  // Cleanup
  return () => {
    isMounted = false;
    if (locationSubscription) {
      locationSubscription.remove();
    }
  };
}, []);
```

### **Diferencias por Plataforma:**
| Plataforma | Método | Intervalo | Trigger |
|------------|--------|-----------|---------|
| Web | setInterval | 60 segundos | Tiempo |
| iOS/Android | watchPositionAsync | 10m o 60s | Distancia o tiempo |

---

## 🗺️ **Componente de Mapa (Líneas 200-350)**

### **Configuración del MapView:**
```javascript
<MapView
  ref={mapRef}
  style={[styles.map, customHeight && { height: customHeight }]}
  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
  showsUserLocation={true}
  showsMyLocationButton={true}
  showsCompass={true}
  initialRegion={{
    latitude: location?.coords?.latitude || -34.6037,
    longitude: location?.coords?.longitude || -58.3816,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  }}
  onMapReady={() => setMapReady(true)}
  onError={(e) => {
    console.error('Map error:', e);
    setMapError(true);
  }}
  {...mapConfig}  // Configuración de platform-config
>
  {/* Marcador de ubicación actual */}
  {location && (
    <Marker
      coordinate={{
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }}
      title={t('myLocation')}
      description={t('currentPosition')}
    />
  )}
  
  {/* Marcador y círculo de tarea */}
  {taskLocation && (
    <>
      <Marker
        coordinate={{
          latitude: taskLocation.coordinates[1],
          longitude: taskLocation.coordinates[0]
        }}
        title={t('taskLocation')}
        pinColor="red"
      />
      <Circle
        center={{
          latitude: taskLocation.coordinates[1],
          longitude: taskLocation.coordinates[0]
        }}
        radius={taskLocation.radius * 1000}  // Convertir km a metros
        fillColor="rgba(255,0,0,0.2)"
        strokeColor="rgba(255,0,0,0.5)"
        strokeWidth={2}
      />
    </>
  )}
</MapView>
```

### **Características del Mapa:**
- **Provider**: Google Maps (Android) / Apple Maps (iOS)
- **showsUserLocation**: Punto azul del usuario
- **showsMyLocationButton**: Botón para centrar
- **initialRegion**: Buenos Aires por defecto
- **Marcadores**: Usuario actual + ubicación de tarea
- **Círculo de radio**: Área de trabajo de tarea

---

## 🎨 **Estados de UI**

### **1. Estado de Carga:**
```javascript
if (loading) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fff3e5" />
      <Text style={styles.loadingText}>{t('gettingLocation')}</Text>
    </View>
  );
}
```

### **2. Estado de Error:**
```javascript
if (errorMsg) {
  return (
    <View style={styles.container}>
      <Ionicons name="location-outline" size={50} color="#ff6b6b" />
      <Text style={styles.errorText}>{errorMsg}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={getLocation}>
        <Text style={styles.retryButtonText}>{t('retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### **3. Mapa con Controles Opcionales:**
```javascript
{showWorkControls && (
  <View style={styles.workControls}>
    <TouchableOpacity 
      style={[styles.workButton, isWorking && styles.workingButton]}
      onPress={handleWorkToggle}
    >
      <Ionicons 
        name={isWorking ? "stop-circle" : "play-circle"} 
        size={24} 
        color="white" 
      />
      <Text style={styles.buttonText}>
        {isWorking ? t('stopWork') : t('startWork')}
      </Text>
    </TouchableOpacity>
  </View>
)}
```

---

## 🔧 **Manejo de Errores y Fallbacks**

### **Errores de Permisos:**
```javascript
if (!permissionGranted) {
  Alert.alert(
    t('permissionRequired'),
    t('locationPermissionMessage'),
    [
      { text: t('cancel'), style: 'cancel' },
      { text: t('openSettings'), onPress: () => Linking.openSettings() }
    ]
  );
}
```

### **Error de Mapa:**
```javascript
onError={(e) => {
  console.error('Map error:', e);
  setMapError(true);
  // Incrementar key para forzar re-render
  setMapKey(prevKey => prevKey + 1);
}}
```

### **Fallback de Ubicación:**
```javascript
// Buenos Aires por defecto si no hay ubicación
const defaultLocation = {
  latitude: -34.6037,
  longitude: -58.3816
};
```

---

## 📊 **Configuración por Plataforma**

### **Android Específico:**
```javascript
{
  accuracy: Location.Accuracy.Balanced,
  enableHighAccuracy: true,
  distanceFilter: 5,
  fastestInterval: 5000,
  showLocationDialog: true
}
```

### **iOS Específico:**
```javascript
{
  accuracy: Location.Accuracy.BestForNavigation,
  enableHighAccuracy: true,
  distanceFilter: 5,
  timeInterval: 5000
}
```

### **Web Específico:**
```javascript
// Polling manual cada minuto
setInterval(() => getLocation(), 60000);
```

---

## 💡 **Uso desde Componente Padre**

### **Ejemplo Completo:**
```javascript
const ParentComponent = () => {
  const mapRef = useRef(null);
  
  // Centrar mapa en ubicación específica
  const centerOnTask = (task) => {
    if (mapRef.current && task.location) {
      mapRef.current.centerOnLocation(
        task.location.coordinates[1],  // lat
        task.location.coordinates[0]   // lng
      );
    }
  };
  
  // Callback cuando cambia ubicación
  const handleLocationChange = (location) => {
    console.log('Nueva ubicación:', location.coords);
    // Enviar al servidor
    api.updateUserLocation(location.coords);
  };
  
  return (
    <LocationComponent
      ref={mapRef}
      onLocationChange={handleLocationChange}
      showWorkControls={true}
      customHeight={400}
      taskLocation={currentTask?.location}
    />
  );
};
```

---

## 🚨 **Permisos Requeridos**

### **iOS (Info.plist):**
- NSLocationWhenInUseUsageDescription
- NSLocationAlwaysAndWhenInUseUsageDescription

### **Android (AndroidManifest.xml):**
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION (si tracking continuo)

---

## 📝 **Notas Importantes**

- **Permisos críticos**: Sin ellos no funciona nada
- **Watch position**: Consume batería, usar con cuidado
- **Precisión variable**: Balanced para ahorrar batería
- **Fallback Buenos Aires**: Para testing sin GPS
- **forwardRef**: Permite control imperativo desde padre
- **Cleanup importante**: Remover subscriptions al desmontar

Este componente es **fundamental para todas las funciones de ubicación** y debe optimizarse para consumo de batería.
