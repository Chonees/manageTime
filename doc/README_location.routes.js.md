# README: backend/src/routes/location.routes.js - Rutas de Ubicaciones

## 📋 **¿Qué es este archivo?**
`location.routes.js` define las **rutas de tracking GPS**.

## 🎯 **Propósito**
- Registro de ubicaciones
- Consulta de historial
- Tracking en tiempo real
- Análisis de rutas

## 🛣️ **Rutas Disponibles**

### **POST /api/locations**
- Guardar ubicación
- Requiere auth
- Batch de ubicaciones
- Tipos: start/end/tracking

### **GET /api/locations/history**
- Historial de usuario
- Requiere auth
- Filtros por fecha
- Paginación

### **GET /api/locations/last**
- Última ubicación conocida
- Requiere auth
- Para mostrar en mapa

### **GET /api/locations/nearby**
- Usuarios cercanos
- Requiere auth + isAdmin
- Radio configurable
- Solo usuarios activos

### **GET /api/locations/route**
- Ruta del día
- Requiere auth
- Puntos de tracking
- Para visualización

### **GET /api/locations/stats**
- Estadísticas de ubicación
- Tiempo en sitios
- Distancias recorridas

## 🔐 **Seguridad**
- Validación de coordenadas
- Privacidad de ubicaciones
- Rate limiting
