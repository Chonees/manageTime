# README: backend/src/controllers/auth.controller.js - Controlador de Autenticación

## 📋 **¿Qué es este archivo?**

`auth.controller.js` es el **controlador central de autenticación** del backend de ManageTime. Maneja todo el flujo de autenticación: registro de usuarios, login con JWT, verificación de tokens, y logout. Implementa reglas especiales para administradores y usuarios desactivados, con logging detallado para debugging.

## 🎯 **Propósito**
- Manejar registro de nuevos usuarios con validación
- Implementar login con JWT y múltiples métodos (username/email)
- Verificar tokens para sesiones persistentes
- Gestionar estado activo/inactivo de usuarios
- Auto-reactivar administradores
- Proporcionar logout limpio
- Generar tokens JWT seguros con expiración

## ⚡ **¿Cómo funciona?**

El controlador gestiona el **ciclo completo de autenticación**:
1. **Registro**: Valida, hashea password, genera token
2. **Login**: Verifica credenciales, estado activo, genera JWT
3. **Verificación**: Valida token existente, retorna usuario
4. **Logout**: Invalida sesión (lado cliente)
5. **Reglas especiales**: Admins siempre pueden entrar

---

## 📖 **Explicación Función por Función**

### **Líneas 1-2: Dependencias**
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
```
- **`jsonwebtoken`**: Generación y verificación de JWT
- **`User`**: Modelo Mongoose para usuarios

---

## 📝 **Función REGISTER (Líneas 5-58)**

### **Estructura General:**
```javascript
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
```

### **Líneas 10-18: Validación de Duplicados**
```javascript
const existingUser = await User.findOne({ 
  $or: [{ email }, { username }] 
});

if (existingUser) {
  return res.status(400).json({ 
    message: 'El usuario o correo electrónico ya está registrado' 
  });
}
```
- **`$or` operator**: Busca por email O username
- **400 Bad Request**: Si ya existe
- **Previene duplicados**: Username y email únicos

### **Líneas 21-30: Creación de Usuario**
```javascript
const user = new User({
  username,
  email,
  password,  // Se hashea automáticamente en pre-save
  isAdmin: false, // NUNCA admin por defecto
  isActive: true  // Activo por defecto
});

await user.save();
```
- **Password auto-hash**: Middleware pre-save lo hashea
- **isAdmin: false**: Seguridad - nunca admin por defecto
- **isActive: true**: Usuarios nuevos están activos

### **Líneas 33-37: Generación de JWT**
```javascript
const token = jwt.sign(
  { 
    id: user._id, 
    isAdmin: user.isAdmin, 
    isSuperAdmin: user.isSuperAdmin 
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }  // Típicamente '7d'
);
```
- **Payload JWT**: ID + roles del usuario
- **Secret**: Variable de entorno segura
- **Expiración**: Configurable (default 7 días)

### **Líneas 40-53: Respuesta Exitosa**
```javascript
const userResponse = {
  id: user._id,
  username: user.username,
  email: user.email,
  isAdmin: user.isAdmin,
  isSuperAdmin: user.isSuperAdmin,
  isActive: user.isActive,
  createdAt: user.createdAt
};

res.status(201).json({
  user: userResponse,
  token
});
```
- **Sin password**: Nunca enviar hash al frontend
- **201 Created**: Código para recurso creado
- **Token incluido**: Para auto-login post-registro

---

## 🔐 **Función LOGIN (Líneas 61-130)**

### **Líneas 67-73: Búsqueda Flexible**
```javascript
const user = await User.findOne({ 
  $or: [
    { username }, 
    { email: username }  // Permite login con email
  ]
});
```
- **Doble búsqueda**: Username O email en mismo campo
- **UX mejorada**: Usuario puede usar cualquiera

### **Líneas 83-89: Verificación de Password**
```javascript
const isPasswordValid = await user.comparePassword(password);

if (!isPasswordValid) {
  return res.status(401).json({ message: 'Contraseña incorrecta' });
}
```
- **Método del modelo**: `comparePassword` usa bcrypt
- **401 Unauthorized**: Credenciales inválidas
- **Async compare**: Seguro contra timing attacks

### **Líneas 92-102: Gestión de Estado Activo**
```javascript
// Usuarios normales desactivados no pueden entrar
if (!user.isActive && !user.isAdmin) {
  return res.status(403).json({ 
    message: 'Este usuario ha sido desactivado. Por favor, contacte al administrador.' 
  });
}

// Admins se reactivan automáticamente
if (user.isAdmin && !user.isActive) {
  user.isActive = true;
  await user.save();
  console.log('Administrador reactivado automáticamente:', username);
}
```
- **Regla de negocio**: Usuarios desactivados bloqueados
- **Excepción admin**: Admins siempre pueden entrar
- **Auto-reactivación**: Admins se activan al login
- **403 Forbidden**: Para usuarios desactivados

### **Líneas 105-125: Generación de Token y Respuesta**
```javascript
const token = jwt.sign(
  { 
    id: user._id, 
    isAdmin: user.isAdmin, 
    isSuperAdmin: user.isSuperAdmin 
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

res.status(200).json({
  user: userResponse,  // Sin password
  token
});
```
- **Mismo formato**: Que en registro
- **Roles en token**: Para verificación rápida
- **200 OK**: Login exitoso

---

## ✅ **Función CHECK TOKEN (Líneas 133-147)**

```javascript
exports.checkToken = async (req, res) => {
  try {
    // Middleware verifyToken ya validó y agregó req.userId
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar token' });
  }
};
```
- **Prerequisito**: Middleware `verifyToken` ya ejecutó
- **`req.userId`**: Añadido por middleware
- **`.select('-password')`**: Excluye password del query
- **Uso**: Verificar sesión al cargar app

---

## 🚪 **Función LOGOUT (Líneas 150-178)**

```javascript
exports.logout = async (req, res) => {
  try {
    // El token se invalida del lado del cliente
    // Aquí podríamos agregar el token a una blacklist si fuera necesario
    
    res.status(200).json({ 
      message: 'Sesión cerrada correctamente' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al cerrar sesión' 
    });
  }
};
```
- **Stateless JWT**: No hay sesión en servidor
- **Cliente responsibility**: Borrar token de AsyncStorage
- **Blacklist opcional**: Para invalidación inmediata
- **Simple**: Solo confirma la acción

---

## 🔄 **Flujo de Autenticación Completo**

```
REGISTRO:
Cliente → POST /api/auth/register
    ↓
Validar duplicados
    ↓
Crear usuario (password hash automático)
    ↓
Generar JWT
    ↓
Responder con user + token

LOGIN:
Cliente → POST /api/auth/login
    ↓
Buscar por username/email
    ↓
Verificar password con bcrypt
    ↓
Verificar estado activo (excepto admins)
    ↓
Generar JWT
    ↓
Responder con user + token

VERIFICACIÓN:
Cliente → GET /api/auth/check-token
    ↓
Middleware verifyToken valida JWT
    ↓
Buscar usuario por ID
    ↓
Responder con datos de usuario
```

---

## 🛡️ **Seguridad Implementada**

### **1. Passwords:**
- Hash con bcrypt (salt rounds 10)
- Nunca se envían al cliente
- Comparación segura timing-safe

### **2. JWT:**
- Secret en variable de entorno
- Expiración configurable
- Payload mínimo (id, roles)

### **3. Validaciones:**
- Duplicados username/email
- Estado activo de usuarios
- Verificación en cada request

### **4. Códigos HTTP:**
- 201: Recurso creado
- 200: Operación exitosa
- 400: Bad request
- 401: No autorizado
- 403: Prohibido
- 404: No encontrado
- 500: Error servidor

---

## 📊 **Logging y Debugging**

```javascript
console.log('Intento de login:', { username });
console.log('Usuario encontrado:', user.username);
console.log('Contraseña válida:', isPasswordValid);
console.log('Administrador reactivado automáticamente:', username);
```
- **Logs estratégicos**: En puntos clave del flujo
- **Sin datos sensibles**: Nunca loguear passwords
- **Útil para debugging**: Seguir flujo de auth

---

## 🚨 **Manejo de Errores**

### **Patrón Try-Catch:**
```javascript
try {
  // Lógica principal
} catch (error) {
  console.error('Error específico:', error);
  res.status(500).json({ 
    message: 'Mensaje genérico',
    error: error.message  // Solo en desarrollo
  });
}
```
- **Errores genéricos**: No exponer detalles en producción
- **Logging completo**: Para debugging interno
- **Status 500**: Para errores no manejados

---

## 💡 **Casos Especiales y Reglas de Negocio**

### **1. Login Dual (Username/Email):**
```javascript
{ $or: [{ username }, { email: username }] }
```
- Usuario puede usar cualquiera
- Mismo campo en formulario

### **2. Auto-reactivación de Admins:**
```javascript
if (user.isAdmin && !user.isActive) {
  user.isActive = true;
  await user.save();
}
```
- Admins nunca quedan bloqueados
- Se reactivan automáticamente

### **3. Usuarios Desactivados:**
```javascript
if (!user.isActive && !user.isAdmin) {
  return res.status(403).json({ message: 'Usuario desactivado' });
}
```
- Solo admins pueden reactivarlos
- Mensaje claro para contactar admin

---

## 🔧 **Variables de Entorno Requeridas**

```env
JWT_SECRET=m4n4g3T1m3_S3cur3_K3y_2025_XYZ_9876543210
JWT_EXPIRES_IN=7d
```
- **JWT_SECRET**: Mínimo 32 caracteres, aleatorio
- **JWT_EXPIRES_IN**: Formato zeit/ms (7d, 24h, etc.)

---

## 📝 **Notas Importantes**

- **Passwords hasheados**: Automático en modelo User
- **Admins privilegiados**: Siempre pueden entrar
- **Token stateless**: Cliente maneja persistencia
- **Logging cuidadoso**: No exponer datos sensibles
- **Códigos HTTP correctos**: Para cada situación

Este controlador es **crítico para la seguridad** de toda la aplicación y debe manejarse con extremo cuidado.
