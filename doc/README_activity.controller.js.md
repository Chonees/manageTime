# README: backend/src/controllers/activity.controller.js - Controlador de Actividades

## 📋 **¿Qué es este archivo?**
`activity.controller.js` gestiona el **registro y consulta de actividades del sistema**.

## 🎯 **Propósito**
- Registrar todas las actividades
- Consultar historial de acciones
- Generar reportes de auditoría
- Análisis de productividad

## 🚀 **Funciones Principales**

### **createActivity**
- Registra nueva actividad
- Tipos: login, task_complete, location_check, etc.
- Metadata flexible según tipo
- Asociación con usuario y tarea

### **getUserActivities**
- Actividades de un usuario
- Paginación y filtros
- Ordenamiento por fecha

### **getAdminActivities**
- Vista administrativa
- Todos los usuarios (según permisos)
- Filtros avanzados por tipo/fecha

### **getActivityStats**
- Estadísticas agregadas
- Métricas de productividad
- Reportes por período

### **exportActivities**
- Exportación CSV/Excel
- Filtros personalizados
- Para auditoría externa

## 📊 **Características**
- Registro automático desde otros controllers
- Inmutable (no se editan)
- Índices optimizados para queries
