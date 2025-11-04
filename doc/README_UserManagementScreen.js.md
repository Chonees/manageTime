# README: src/screens/admin/UserManagementScreen.js - Pantalla de Gestión de Usuarios

## 📋 **¿Qué es este archivo?**
`UserManagementScreen.js` permite **gestionar usuarios** desde la app móvil.

## 🎯 **Propósito**
- CRUD de usuarios
- Activar/desactivar cuentas
- Asignar roles
- Ver estadísticas de usuario

## 📱 **Componentes UI**

### **Lista de Usuarios**
- FlatList con búsqueda
- Estado visual (activo/inactivo)
- Roles claramente marcados
- Acciones rápidas

### **Filtros**
- Por estado (activo/inactivo)
- Por rol (admin/usuario)
- Por fecha de registro
- Por actividad reciente

### **Acciones por Usuario**
- Activar/desactivar
- Cambiar rol
- Ver detalles
- Ver actividades
- Asignar a admin

### **Modal de Detalles**
- Información completa
- Estadísticas personales
- Historial de actividad
- Tareas asignadas

### **Creación de Usuario**
- Formulario completo
- Validación en tiempo real
- Asignación de rol
- Envío de credenciales

## 🔐 **Validaciones**
- Solo admins pueden acceder
- SuperAdmin para crear admins
- Confirmación para acciones críticas
