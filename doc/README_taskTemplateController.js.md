# README: backend/src/controllers/taskTemplateController.js - Controlador de Plantillas de Tareas

## 📋 **¿Qué es este archivo?**
`taskTemplateController.js` gestiona las **plantillas de tareas reutilizables**.

## 🎯 **Propósito**
- CRUD de plantillas de tareas
- Solo admins pueden crear/editar
- Acelerar creación de tareas repetitivas
- Estandarizar procesos

## 🚀 **Funciones Principales**

### **createTemplate**
- Crear nueva plantilla
- Solo admins
- Validación de campos

### **getTemplates**
- Lista plantillas activas
- Filtros por categoría
- Ordenamiento

### **updateTemplate**
- Editar plantilla existente
- Solo creador o superadmin

### **deleteTemplate**
- Eliminar plantilla
- Soft delete (isActive: false)

### **applyTemplate**
- Aplicar plantilla a nueva tarea
- Auto-rellena campos

## 🔧 **Características**
- Validación de permisos
- Plantillas categorizadas
- Historial de uso
