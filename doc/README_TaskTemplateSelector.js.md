# README: src/components/TaskTemplateSelector.js - Selector de Plantillas de Tareas

## 📋 **¿Qué es este archivo?**
`TaskTemplateSelector.js` permite **seleccionar plantillas** para crear tareas rápidamente.

## 🎯 **Propósito**
- Mostrar plantillas disponibles
- Aplicar plantilla a formulario
- Filtrar por categoría
- Crear nuevas plantillas

## 📱 **Componentes UI**

### **Lista de Plantillas**
- FlatList con plantillas
- Íconos por categoría
- Nombre y descripción
- Última vez usada

### **Filtros**
- Por categoría
- Por frecuencia de uso
- Búsqueda por nombre
- Mis plantillas vs públicas

### **Preview de Plantilla**
- Campos que se auto-rellenarán
- Ubicación si existe
- Tiempo límite
- Keywords

### **Acciones**
- Aplicar plantilla
- Editar plantilla (admin)
- Duplicar plantilla
- Eliminar (creador)

### **Crear Nueva**
- Botón flotante
- Solo para admins
- Formulario completo
- Guardar como pública/privada

## 🔧 **Props**
- onSelect: Callback al seleccionar
- onClose: Cerrar selector
- userRole: Para permisos
- currentData: Datos actuales del form

## ⚡ **Características**
- Búsqueda en tiempo real
- Cache de plantillas
- Ordenamiento inteligente
