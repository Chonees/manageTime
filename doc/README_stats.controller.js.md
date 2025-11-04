# README: backend/src/controllers/stats.controller.js - Controlador de Estadísticas

## 📋 **¿Qué es este archivo?**
`stats.controller.js` genera **estadísticas y métricas del sistema**.

## 🎯 **Propósito**
- Calcular métricas de productividad
- Generar dashboards estadísticos
- Análisis de tendencias
- KPIs empresariales

## 🚀 **Funciones Principales**

### **getDashboardStats**
- Total usuarios activos
- Tareas completadas hoy
- Tiempo promedio por tarea
- Tasa de completado

### **getUserStats**
- Estadísticas individuales
- Productividad personal
- Historial de rendimiento

### **getTeamStats**
- Métricas por equipo/admin
- Comparativas entre usuarios
- Rankings de productividad

### **getLocationStats**
- Tiempo en cada ubicación
- Distancias recorridas
- Patrones de movimiento

### **getTaskStats**
- Análisis de tareas
- Tiempos promedio por tipo
- Tasas de aceptación/rechazo

## 📊 **Características**
- Aggregation pipelines MongoDB
- Cache de resultados
- Actualización en tiempo real
