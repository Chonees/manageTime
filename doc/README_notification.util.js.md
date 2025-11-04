# README: backend/src/utils/notification.util.js - Utilidades de Notificaciones

## 📋 **¿Qué es este archivo?**
`notification.util.js` contiene **utilidades para notificaciones push**.

## 🎯 **Propósito**
- Funciones helper para notificaciones
- Integración con Expo Push API
- Gestión de tokens
- Retry y error handling

## 🚀 **Funciones Principales**

### **sendPushNotification**
- Envío individual
- Validación de token
- Retry automático

### **sendBulkNotifications**
- Envío masivo
- Batch processing
- Optimización de requests

### **validatePushToken**
- Validar formato token
- Verificar si es válido
- Limpieza automática

### **formatNotificationData**
- Formatear payload
- Según tipo de notificación
- Datos personalizados

### **scheduleNotification**
- Programar envío
- Para recordatorios
- Cancelable

### **getDeliveryStatus**
- Estado de entrega
- Tickets de Expo
- Estadísticas

## 📱 **Características**
- Expo Push API integration
- Error handling robusto
- Logging detallado
- Rate limiting
