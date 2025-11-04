# README: src/components/TaskTimer.js - Componente Temporizador de Tareas

## 📋 **¿Qué es este archivo?**
`TaskTimer.js` es el **componente de temporizador** para tareas con límite de tiempo.

## 🎯 **Propósito**
- Mostrar tiempo restante
- Alertas de vencimiento
- Cuenta regresiva visual
- Notificaciones automáticas

## 📱 **Componentes UI**

### **Display Principal**
- Tiempo en formato HH:MM:SS
- Barra de progreso circular
- Colores según urgencia
- Animaciones suaves

### **Estados Visuales**
- Verde: >30% tiempo restante
- Amarillo: 10-30% restante
- Rojo: <10% restante
- Parpadeante: <5 minutos

### **Controles**
- Pausar/reanudar
- Extender tiempo (admin)
- Marcar como completada
- Solicitar extensión

### **Alertas**
- 15 minutos restantes
- 5 minutos restantes
- 1 minuto restante
- Tiempo expirado

## 🔧 **Props**
- timeLimit: Límite en minutos
- startTime: Momento de inicio
- onExpire: Callback al expirar
- onAlert: Callback de alertas
- canExtend: Si permite extensión

## ⚡ **Características**
- Actualización cada segundo
- Persiste al cambiar pantalla
- Background notifications
- Sonidos de alerta
