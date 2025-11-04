# README: backend/src/routes/notification.routes.js - Rutas de Notificaciones

## 📋 **¿Qué es este archivo?**
`notification.routes.js` define las **rutas de notificaciones push**.

## 🎯 **Propósito**
- Gestión de notificaciones
- Registro de tokens push
- Envío de alertas
- Configuración de preferencias

## 🛣️ **Rutas Disponibles**

### **POST /api/notifications/register-token**
- Registrar token push
- Requiere auth
- Para recibir notificaciones

### **POST /api/notifications/send**
- Enviar notificación
- Requiere isAdmin
- A usuario específico

### **POST /api/notifications/broadcast**
- Notificación masiva
- Requiere isSuperAdmin
- A todos los usuarios

### **GET /api/notifications/history**
- Historial de notificaciones
- Requiere auth
- Paginado

### **PUT /api/notifications/preferences**
- Configurar preferencias
- Tipos de notificación
- Horarios permitidos

### **DELETE /api/notifications/token**
- Eliminar token
- Al cerrar sesión
- Limpieza automática

## 📱 **Características**
- Integración Expo Push
- Retry automático
- Estadísticas de entrega
