# README: backend/src/models/TaskTemplate.js - Modelo de Plantillas de Tareas

## 📋 **¿Qué es este archivo?**
`TaskTemplate.js` define **plantillas reutilizables** para crear tareas recurrentes rápidamente.

## 🎯 **Propósito**
- Crear plantillas de tareas comunes
- Acelerar creación de tareas repetitivas
- Estandarizar procesos de trabajo
- Mantener consistencia en tareas similares

## 📖 **Campos del Modelo**
- **name**: Nombre de la plantilla (requerido)
- **title**: Título predefinido de tarea
- **description**: Descripción estándar
- **location**: Ubicación predefinida (GeoJSON)
- **radius**: Radio de trabajo
- **timeLimit**: Límite de tiempo en minutos
- **keywords**: Palabras clave para modo voz
- **createdBy**: Admin que creó la plantilla
- **isActive**: Si está disponible para uso

## 🔧 **Uso**
- Solo admins pueden crear/editar plantillas
- Usuarios seleccionan plantilla al crear tarea
- Auto-rellena campos con valores predefinidos
