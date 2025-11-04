# README: src/screens/ApiTestScreen.js - Pantalla de Diagnóstico API

## 📋 **¿Qué es este archivo?**
`ApiTestScreen.js` es la **pantalla de diagnóstico de conectividad**.

## 🎯 **Propósito**
- Probar conexión con backend
- Diagnosticar problemas de red
- Verificar endpoints
- Debugging de API

## 📱 **Componentes UI**

### **Tests de Conectividad**
- Ping al servidor
- Test de login
- Verificación de token
- Latencia de red

### **Información del Sistema**
- URL de API actual
- Modo de Expo
- Versión de app
- Estado de red

### **Tests de Endpoints**
- GET /api/health
- POST /api/auth/login
- GET /api/tasks
- POST /api/locations

### **Logs en Tiempo Real**
- Requests/responses
- Errores de red
- Timeouts
- Status codes

### **Acciones de Diagnóstico**
- Limpiar caché
- Cambiar URL API
- Reintentar conexión
- Exportar logs

## 🔧 **Características**
- Solo visible en desarrollo
- Logs detallados
- Export de diagnóstico
- Tests automatizados
