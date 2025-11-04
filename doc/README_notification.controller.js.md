# README: backend/src/controllers/notification.controller.js - Controlador de Notificaciones

## 📋 **¿Qué es este archivo?**
`notification.controller.js` maneja **notificaciones push y alertas**.

## 🎯 **Propósito**
- Enviar notificaciones push
- Gestionar alertas del sistema
- Notificar asignación de tareas
- Alertas de tiempo límite

## 🚀 **Funciones Principales**

### **sendPushNotification**
- Envío via Expo Push
- A usuario específico o grupo
- Con datos personalizados

### **notifyTaskAssignment**
- Notifica nueva tarea asignada
- Incluye detalles de tarea
- Link directo a la tarea

### **notifyTaskExpiring**
- Alerta de tiempo límite cercano
- Configurable (5, 10, 15 min antes)
- Solo si tarea activa

### **broadcastToAdmins**
- Notificación a todos los admins
- Para eventos críticos
- Con prioridad alta

### **scheduleNotification**
- Programa notificaciones futuras
- Para recordatorios
- Cancelables

## 📱 **Características**
- Integración Expo Push API
- Gestión de tokens
- Retry en fallos
