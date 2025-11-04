# README: src/screens/TaskDetailsScreen.js - Pantalla de Detalles de Tarea

## 📋 **¿Qué es este archivo?**
`TaskDetailsScreen.js` muestra los **detalles completos de una tarea** con acciones disponibles.

## 🎯 **Propósito**
- Mostrar información completa de tarea
- Permitir aceptar/rechazar tareas
- Actualizar estado de progreso
- Completar con validación GPS
- Ver ubicación en mapa
- Gestionar notas y tiempo

## 📱 **Componentes UI**

### **Header**
- Título de tarea
- FileNumber prominente
- Estado actual con color
- Tiempo límite si existe

### **Información Principal**
- Descripción completa
- Usuario asignado
- Fechas de creación/vencimiento
- Estado del flujo trabajo

### **Mapa de Ubicación**
- Si tarea tiene location
- Marcador con radio
- Botón para direcciones
- Validación de proximidad

### **Acciones Disponibles**
- Aceptar/Rechazar (si waiting)
- En camino (si aceptada)
- En el sitio (GPS validado)
- Completar (dentro del radio)

### **Timer**
- Si tiene límite de tiempo
- Cuenta regresiva visual
- Alerta cuando expira

## 🔐 **Validaciones**
- GPS para "en el sitio"
- Radio para completar
- Tiempo límite activo
- Estado correcto para acciones
