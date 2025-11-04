# README: backend/src/routes/auth.routes.js - Rutas de Autenticación

## 📋 **¿Qué es este archivo?**
`auth.routes.js` define las **rutas de autenticación** del sistema.

## 🎯 **Propósito**
- Endpoints de login/logout
- Registro de usuarios
- Verificación de tokens
- Recuperación de contraseña

## 🛣️ **Rutas Disponibles**

### **POST /api/auth/register**
- Registro de nuevo usuario
- Público (sin auth)
- Validación de datos únicos
- Retorna token JWT

### **POST /api/auth/login**
- Inicio de sesión
- Público (sin auth)
- Username o email
- Retorna token y usuario

### **GET /api/auth/check-token**
- Verifica token válido
- Requiere auth (verifyToken)
- Retorna usuario actual
- Para persistencia de sesión

### **POST /api/auth/logout**
- Cierre de sesión
- Requiere auth
- Limpieza de token
- Registro de actividad

### **POST /api/auth/forgot-password**
- Solicitud reset password
- Público
- Envía email con link

## 🔐 **Seguridad**
- Rate limiting en login
- Validación de inputs
- Tokens con expiración
