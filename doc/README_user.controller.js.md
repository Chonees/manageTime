# README: backend/src/controllers/user.controller.js - Controlador de Usuarios

## 📋 **¿Qué es este archivo?**
`user.controller.js` gestiona todas las **operaciones CRUD de usuarios** y administración de empleados.

## 🎯 **Propósito**
- Obtener lista de usuarios (con filtros por admin)
- Actualizar información de usuarios
- Cambiar estado activo/inactivo
- Asignar empleados a administradores
- Eliminar usuarios
- Gestionar permisos y roles

## 🚀 **Funciones Principales**

### **getAllUsers**
- Admins: ven solo sus empleados asignados
- SuperAdmin: ve todos los usuarios
- Filtros por estado, rol, etc.

### **updateUser**
- Actualiza datos del usuario
- Validación de campos únicos (email, username)
- Solo admin del usuario o superadmin

### **toggleUserStatus**
- Activa/desactiva usuarios
- Afecta capacidad de login
- Registra cambio en activities

### **assignUserToAdmin**
- Asigna empleado a administrador
- Solo superadmin puede ejecutar
- Validación de jerarquía

## 🔐 **Seguridad**
- Verificación de permisos por rol
- Validación de propiedad admin-empleado
- No permite modificar superadmins
