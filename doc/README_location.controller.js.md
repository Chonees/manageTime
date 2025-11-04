# README: backend/src/controllers/location.controller.js - Controlador de Ubicaciones

## 📋 **¿Qué es este archivo?**
`location.controller.js` maneja el **registro y consulta de ubicaciones GPS**.

## 🎯 **Propósito**
- Registrar ubicaciones de usuarios
- Consultar historial de movimientos
- Tracking en tiempo real
- Análisis de rutas y tiempos
- Reportes de asistencia

## 🚀 **Funciones Principales**

### **saveLocation**
- Guarda nueva ubicación
- Tipos: start/end/tracking
- Validación de coordenadas
- Timestamp automático

### **getLocationHistory**
- Historial por usuario y fecha
- Paginación de resultados
- Filtros por tipo

### **getLastLocation**
- Última ubicación conocida
- Para mostrar en mapas
- Cache de 5 minutos

### **getLocationsByRadius**
- Búsquedas geoespaciales
- Usuarios en área específica
- Queries optimizadas con índices

### **calculateWorkTime**
- Calcula horas trabajadas
- Basado en start/end
- Reportes diarios/semanales

## 🗺️ **Características**
- Soporte geoespacial MongoDB
- Validación GPS
- Agregación para reportes
