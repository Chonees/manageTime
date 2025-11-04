# README: src/services/location-service.js - Servicio de Ubicación

## 📋 **¿Qué es este archivo?**
`location-service.js` es el **servicio central de GPS** que maneja toda la lógica de ubicación.

## 🎯 **Propósito**
- Gestión centralizada de GPS
- Background tracking
- Optimización de batería
- Manejo de permisos

## 🚀 **Funciones Principales**

### **startLocationTracking**
- Iniciar tracking continuo
- Configuración de precisión
- Background mode
- Battery optimization

### **stopLocationTracking**
- Detener tracking
- Cleanup de recursos
- Guardar estado
- Notificación final

### **getCurrentLocation**
- Ubicación actual única
- Timeout configurable
- Fallback a última conocida
- Error handling

### **requestPermissions**
- Solicitar permisos GPS
- Manejo de rechazos
- Explicación al usuario
- Redirect a settings

### **isLocationEnabled**
- Verificar GPS activo
- Estado de permisos
- Servicios disponibles
- Precisión actual

### **getLocationAccuracy**
- Nivel de precisión
- Recomendaciones
- Factores que afectan
- Mejoras sugeridas

## 🔧 **Características**
- Background execution
- Battery aware
- Permission management
- Error recovery
- Offline support
