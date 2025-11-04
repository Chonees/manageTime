# README: backend/src/routes/stats.routes.js - Rutas de Estadísticas

## 📋 **¿Qué es este archivo?**
`stats.routes.js` define las **rutas de estadísticas y métricas**.

## 🎯 **Propósito**
- Endpoints de métricas
- Dashboards estadísticos
- KPIs empresariales
- Análisis de tendencias

## 🛣️ **Rutas Disponibles**

### **GET /api/stats/dashboard**
- Métricas del dashboard
- Requiere auth
- Datos en tiempo real

### **GET /api/stats/user/:userId**
- Estadísticas de usuario
- Requiere auth + permisos
- Productividad individual

### **GET /api/stats/team**
- Métricas de equipo
- Requiere isAdmin
- Comparativas

### **GET /api/stats/tasks**
- Estadísticas de tareas
- Análisis de rendimiento
- Filtros por período

### **GET /api/stats/locations**
- Métricas de ubicaciones
- Tiempo en sitios
- Patrones de movimiento

### **GET /api/stats/export**
- Exportar estadísticas
- Formato CSV/JSON
- Para análisis externo

## 🔐 **Middlewares**
- verifyToken en todas
- isAdmin para métricas globales
- Cache de resultados
