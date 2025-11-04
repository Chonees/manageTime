# README: backend/src/routes/user.routes.js - Rutas de Usuarios

## 📋 **¿Qué es este archivo?**
`user.routes.js` define las **rutas de gestión de usuarios**.

## 🎯 **Propósito**
- CRUD de usuarios
- Gestión de permisos
- Asignación admin-empleado
- Control de estados

## 🛣️ **Rutas Disponibles**

### **GET /api/users**
- Lista de usuarios
- Requiere auth
- Filtrado por admin
- Paginación

### **GET /api/users/:id**
- Usuario específico
- Requiere auth
- Validación de acceso

### **PUT /api/users/:id**
- Actualizar usuario
- Requiere auth
- Solo admin o propietario

### **DELETE /api/users/:id**
- Eliminar usuario
- Requiere isAdmin
- Solo superadmin para admins

### **PUT /api/users/:id/status**
- Activar/desactivar usuario
- Requiere isAdmin
- Afecta capacidad de login

### **POST /api/users/:id/assign**
- Asignar a admin
- Requiere isSuperAdmin
- Gestión de jerarquía

## 🔐 **Middlewares**
- verifyToken en todas
- isAdmin para gestión
- isSuperAdmin para críticas
