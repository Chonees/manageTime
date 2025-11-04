# README: backend/src/models/adminPushToken.model.js - Modelo de Tokens Push Admin

## 📋 **¿Qué es este archivo?**
`adminPushToken.model.js` almacena **tokens de notificaciones push** para administradores.

## 🎯 **Propósito**
- Almacenar tokens Expo Push
- Gestionar notificaciones a admins
- Soportar múltiples dispositivos por admin
- Limpiar tokens expirados

## 📖 **Campos del Modelo**
- **adminId**: Admin propietario (ObjectId, requerido)
- **token**: Expo Push Token (String, único)
- **deviceInfo**: Información del dispositivo
- **isActive**: Si el token está activo
- **lastUsed**: Última vez usado
- **timestamps**: createdAt y updatedAt

## 🔧 **Características**
- Índice único en token
- Auto-limpieza de tokens antiguos
- Validación formato ExponentPushToken
