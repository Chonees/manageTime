# README: backend/src/middleware/auth.middleware.js - Middleware de Autenticación y Autorización

## 📋 **¿Qué es este archivo?**

`auth.middleware.js` es el **guardián de seguridad principal** del backend de ManageTime. Implementa tres middlewares críticos que verifican tokens JWT, validan usuarios, controlan el estado activo de cuentas y gestionan permisos por roles (usuario/admin/superadmin). Es la primera línea de defensa contra accesos no autorizados.

## 🎯 **Propósito**
- Verificar y validar tokens JWT en cada request
- Extraer y adjuntar información del usuario a req
- Controlar estado activo/inactivo de usuarios
- Implementar control de acceso basado en roles
- Prevenir acceso no autorizado a rutas protegidas
- Manejar excepciones para usuarios inactivos
- Proporcionar mensajes de error claros

## ⚡ **¿Cómo funciona?**

Los middlewares actúan como **filtros secuenciales**:
1. **verifyToken**: Valida JWT y carga usuario
2. **isAdmin**: Verifica rol administrativo
3. **isSuperAdmin**: Verifica rol superadmin
4. **Adjunta req.user**: Para uso en controllers
5. **Bloquea o permite**: Según validaciones

---

## 📖 **Explicación Función por Función**

### **Líneas 1-2: Dependencias**
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
```
- **`jsonwebtoken`**: Verificación y decodificación de JWT
- **`User model`**: Para buscar usuario en DB

---

## 🔐 **MIDDLEWARE verifyToken (Líneas 5-50)**

### **Estructura General:**
```javascript
const verifyToken = async (req, res, next) => {
  try {
    // 1. Validar header
    // 2. Extraer token
    // 3. Verificar JWT
    // 4. Buscar usuario
    // 5. Validar estado
    // 6. Adjuntar a req
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};
```

### **Paso 1: Validación del Header (Líneas 7-12)**
```javascript
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ 
    message: 'No se proporcionó token de autenticación' 
  });
}
```
- **Formato esperado**: `Authorization: Bearer <token>`
- **401 Unauthorized**: Si falta header o formato incorrecto
- **Case sensitive**: Debe ser exactamente "Bearer "

### **Paso 2: Extracción del Token (Líneas 14-15)**
```javascript
const token = authHeader.split(' ')[1];
```
- **Split por espacio**: Separa "Bearer" del token
- **Índice [1]**: Obtiene el token después de "Bearer"
- **Ejemplo**: "Bearer eyJhbGc..." → "eyJhbGc..."

### **Paso 3: Verificación JWT (Líneas 17-21)**
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.userId = decoded.id;
```
- **jwt.verify**: Valida firma y expiración
- **JWT_SECRET**: Llave secreta del .env
- **decoded**: Payload del token { id, isAdmin, ... }
- **Throws error**: Si token inválido o expirado

### **Paso 4: Búsqueda de Usuario (Líneas 23-28)**
```javascript
const user = await User.findById(decoded.id).select('-password');

if (!user) {
  return res.status(404).json({ message: 'Usuario no encontrado' });
}
```
- **findById**: Busca usuario por ID del token
- **`.select('-password')`**: Excluye campo password
- **404 Not Found**: Si usuario fue eliminado

### **Paso 5: Validación de Estado Activo (Líneas 30-41)**
```javascript
// Rutas permitidas para usuarios inactivos
const allowedPathsForInactiveUsers = [
  '/logout',           // Permitir cerrar sesión
  '/tasks/my-tasks'    // Permitir ver sus tareas
];

const isAllowedPath = allowedPathsForInactiveUsers.some(
  path => req.path.endsWith(path)
);

if (!user.isActive && !isAllowedPath) {
  return res.status(403).json({ 
    message: 'Cuenta de usuario desactivada' 
  });
}
```
- **Lista blanca**: Rutas permitidas aunque inactivo
- **`.endsWith()`**: Verifica final del path
- **403 Forbidden**: Usuario desactivado
- **Excepciones**: logout y my-tasks siempre permitidos

### **Paso 6: Adjuntar Usuario (Líneas 43-45)**
```javascript
req.user = user;
next();
```
- **req.user**: Objeto usuario completo (sin password)
- **next()**: Continúa al siguiente middleware/controller
- **Disponible downstream**: Controllers pueden usar req.user

---

## 👑 **MIDDLEWARE isAdmin (Líneas 53-58)**

```javascript
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      message: 'Acceso denegado: se requieren permisos de administrador' 
    });
  }
  next();
};
```
- **Prerequisito**: verifyToken debe ejecutarse antes
- **Verifica**: req.user.isAdmin === true
- **403 Forbidden**: Si no es admin
- **Uso**: Rutas administrativas

### **Ejemplo de Uso:**
```javascript
router.post('/users', verifyToken, isAdmin, createUser);
//                     ↑ Primero    ↑ Después
```

---

## 👑👑 **MIDDLEWARE isSuperAdmin (Líneas 61-66)**

```javascript
const isSuperAdmin = (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ 
      message: 'Acceso denegado: se requieren permisos de superadministrador' 
    });
  }
  next();
};
```
- **Mayor privilegio**: Por encima de admin normal
- **Verifica**: req.user.isSuperAdmin === true
- **Uso**: Operaciones críticas del sistema
- **Ejemplo**: Eliminar admins, configuración global

---

## 🔄 **Flujo de Ejecución**

```
HTTP Request
    ↓
Authorization Header presente?
    No → 401 Unauthorized
    Sí ↓
Token formato Bearer?
    No → 401 Unauthorized
    Sí ↓
JWT.verify(token)
    Falla → 401 Token inválido
    Éxito ↓
Usuario existe en DB?
    No → 404 Not Found
    Sí ↓
Usuario activo O ruta permitida?
    No → 403 Cuenta desactivada
    Sí ↓
req.user = userData
    ↓
Es ruta admin?
    Sí → isAdmin check
        No → 403 Forbidden
        Sí ↓
Es ruta superadmin?
    Sí → isSuperAdmin check
        No → 403 Forbidden
        Sí ↓
Controller ejecuta
```

---

## 📊 **Códigos de Estado HTTP**

| Código | Middleware | Causa | Mensaje |
|--------|------------|-------|---------|
| 401 | verifyToken | Sin token | "No se proporcionó token" |
| 401 | verifyToken | Token inválido | "Token inválido o expirado" |
| 403 | verifyToken | Usuario inactivo | "Cuenta desactivada" |
| 404 | verifyToken | Usuario no existe | "Usuario no encontrado" |
| 403 | isAdmin | No es admin | "Se requieren permisos de admin" |
| 403 | isSuperAdmin | No es superadmin | "Se requieren permisos de superadmin" |

---

## 🛡️ **Seguridad Implementada**

### **1. Validación de Token:**
- Firma criptográfica verificada
- Expiración automática (7 días default)
- Secret key segura en variables de entorno

### **2. Prevención de Ataques:**
- **Sin password en req.user**: Nunca expuesto
- **Token en header**: No en URL (previene logging)
- **403 vs 404**: No revela si usuario existe

### **3. Control Granular:**
- 3 niveles de permisos
- Estado activo/inactivo
- Rutas de excepción configurables

---

## 💡 **Patrones de Uso**

### **Ruta Pública (Sin Auth):**
```javascript
router.post('/auth/login', loginController);
// Sin middlewares de auth
```

### **Ruta Autenticada:**
```javascript
router.get('/profile', verifyToken, getProfile);
//                      ↑ Solo token válido
```

### **Ruta Admin:**
```javascript
router.get('/users', verifyToken, isAdmin, getAllUsers);
//                   ↑ Primero    ↑ Después
```

### **Ruta SuperAdmin:**
```javascript
router.delete('/system', verifyToken, isSuperAdmin, systemReset);
//                       ↑ Auth      ↑ Super privilegios
```

---

## 🔧 **Configuración de Excepciones**

### **Agregar Nueva Ruta Permitida para Inactivos:**
```javascript
const allowedPathsForInactiveUsers = [
  '/logout',
  '/tasks/my-tasks',
  '/profile',          // Nueva ruta
  '/notifications'     // Nueva ruta
];
```

### **Verificación Más Específica:**
```javascript
// En lugar de endsWith, usar exact match
const isAllowedPath = allowedPathsForInactiveUsers.includes(req.path);

// O con regex para más control
const isAllowedPath = allowedPathsForInactiveUsers.some(
  pattern => new RegExp(pattern).test(req.path)
);
```

---

## 🚨 **Manejo de Errores**

### **Try-Catch Global:**
```javascript
try {
  // Toda la lógica de verificación
} catch (error) {
  console.error('Error en middleware de autenticación:', error);
  
  // Diferentes mensajes según el error
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expirado' });
  }
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token malformado' });
  }
  
  // Error genérico
  return res.status(401).json({ message: 'Token inválido o expirado' });
}
```

---

## 📝 **Notas Importantes**

- **Orden crítico**: verifyToken SIEMPRE antes que isAdmin
- **req.user disponible**: Después de verifyToken
- **Sin password**: Nunca incluir en req.user
- **Rutas de excepción**: Para UX en usuarios inactivos
- **Logging cuidadoso**: No loguear tokens

Este middleware es **la columna vertebral de la seguridad** y cualquier cambio debe ser cuidadosamente probado.
