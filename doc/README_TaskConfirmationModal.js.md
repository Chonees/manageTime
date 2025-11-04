# README: src/components/TaskConfirmationModal.js - Modal de Confirmación de Tareas

## 📋 **¿Qué es este archivo?**
`TaskConfirmationModal.js` es el **modal de confirmación** para aceptar/rechazar tareas.

## 🎯 **Propósito**
- Confirmar aceptación de tareas
- Mostrar detalles importantes
- Validar ubicación si necesario
- Rechazar con motivo

## 📱 **Componentes UI**

### **Header del Modal**
- Título de la tarea
- FileNumber prominente
- Estado actual
- Botón cerrar

### **Información de Tarea**
- Descripción completa
- Ubicación si existe
- Tiempo límite
- Instrucciones especiales

### **Mapa de Ubicación**
- Si tarea tiene location
- Marcador y radio
- Distancia actual
- Botón direcciones

### **Botones de Acción**
- Aceptar (verde)
- Rechazar (rojo)
- Ver más detalles
- Cancelar

### **Modal de Rechazo**
- Motivos predefinidos
- Campo de texto libre
- Confirmación final

## 🔧 **Props**
- visible: Mostrar/ocultar
- task: Objeto tarea
- onAccept: Callback aceptar
- onReject: Callback rechazar
- onClose: Cerrar modal

## ⚡ **Validaciones**
- GPS si ubicación requerida
- Confirmación doble
- Motivo obligatorio al rechazar
