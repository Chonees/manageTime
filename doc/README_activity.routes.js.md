# README: backend/src/routes/activity.routes.js - Rutas de Actividades

## 📋 **¿Qué es este archivo?**
`activity.routes.js` define las **rutas de registro de actividades**.

## 🎯 **Propósito**
- Registro de eventos
- Consulta de historial
- Reportes de actividad
- Auditoría del sistema

## 🛣️ **Rutas Disponibles**

### **POST /api/activities**
- Crear actividad
- Requiere auth
- Tipos múltiples
- Metadata flexible

### **GET /api/activities**
- Lista actividades usuario
- Requiere auth
- Filtros y paginación
- Ordenamiento

### **GET /api/activities/admin**
- Vista administrativa
- Requiere isAdmin
- Todos los usuarios
- Filtros avanzados

### **GET /api/activities/user/:userId**
- Actividades de usuario específico
- Requiere isAdmin
- Para supervisión

### **GET /api/activities/task/:taskId**
- Actividades de tarea
- Requiere auth
- Timeline de tarea

### **GET /api/activities/export**
- Exportar actividades
- Requiere isAdmin
- Formato CSV/Excel
- Filtros personalizados

## 🔐 **Características**
- Inmutables (no PUT/DELETE)
- Registro automático
- Índices optimizados
