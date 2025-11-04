# README: backend/src/routes/savedLocation.routes.js - Rutas de Ubicaciones Guardadas

## 📋 **¿Qué es este archivo?**
`savedLocation.routes.js` define las **rutas de ubicaciones favoritas**.

## 🎯 **Propósito**
- CRUD ubicaciones guardadas
- Gestión de favoritos
- Límites por usuario
- Ubicaciones por defecto

## 🛣️ **Rutas Disponibles**

### **GET /api/saved-locations**
- Lista ubicaciones del usuario
- Requiere auth
- Ordenadas por uso

### **POST /api/saved-locations**
- Crear ubicación guardada
- Requiere auth
- Máximo 20 por usuario

### **PUT /api/saved-locations/:id**
- Actualizar ubicación
- Solo propietario
- Validación de datos

### **DELETE /api/saved-locations/:id**
- Eliminar ubicación
- Verificación de propiedad
- No elimina si es default

### **PUT /api/saved-locations/:id/default**
- Marcar como default
- Solo una por usuario
- Para uso rápido

### **GET /api/saved-locations/nearby**
- Ubicaciones cercanas
- Radio configurable
- Para sugerencias

## 🔧 **Características**
- Validación de límites
- Nombres únicos por usuario
- Geocoding automático
