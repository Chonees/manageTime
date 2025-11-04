# README: src/services/api-locations.js - API de Ubicaciones

## 📋 **¿Qué es este archivo?**
`api-locations.js` contiene **funciones específicas para ubicaciones** separadas del API principal.

## 🎯 **Propósito**
- Funciones especializadas de GPS
- Optimizaciones para ubicaciones
- Batch operations
- Geocoding services

## 🚀 **Funciones Principales**

### **saveLocationBatch**
- Guardar múltiples ubicaciones
- Optimización de requests
- Retry automático
- Compresión de datos

### **getNearbyUsers**
- Usuarios cercanos
- Radio configurable
- Filtros por estado
- Tiempo real

### **getLocationHistory**
- Historial optimizado
- Paginación eficiente
- Cache inteligente
- Compresión de rutas

### **geocodeAddress**
- Convertir dirección a coordenadas
- Cache de resultados
- Múltiples proveedores
- Fallback automático

### **reverseGeocode**
- Coordenadas a dirección
- Información detallada
- Cache persistente
- Offline support

### **calculateRoute**
- Ruta entre puntos
- Optimización de trayecto
- Tiempo estimado
- Alternativas

## 🔧 **Características**
- Optimizado para GPS
- Batch processing
- Cache avanzado
- Error handling robusto
