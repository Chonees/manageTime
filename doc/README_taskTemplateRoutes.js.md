# README: backend/src/routes/taskTemplateRoutes.js - Rutas de Plantillas de Tareas

## 📋 **¿Qué es este archivo?**
`taskTemplateRoutes.js` define las **rutas de plantillas de tareas**.

## 🎯 **Propósito**
- CRUD de plantillas
- Solo admins pueden crear
- Acelerar creación de tareas
- Estandarización

## 🛣️ **Rutas Disponibles**

### **GET /api/task-templates**
- Lista plantillas activas
- Requiere auth
- Filtros por categoría

### **POST /api/task-templates**
- Crear nueva plantilla
- Requiere isAdmin
- Validación completa

### **GET /api/task-templates/:id**
- Obtener plantilla específica
- Requiere auth
- Para aplicar a tarea

### **PUT /api/task-templates/:id**
- Actualizar plantilla
- Solo creador o superadmin
- Versionado

### **DELETE /api/task-templates/:id**
- Eliminar plantilla
- Soft delete
- Requiere isAdmin

### **POST /api/task-templates/:id/apply**
- Aplicar plantilla
- Crear tarea desde template
- Auto-rellena campos

## 🔧 **Características**
- Categorización
- Historial de uso
- Plantillas públicas/privadas
