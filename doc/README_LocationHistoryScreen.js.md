# README: src/screens/LocationHistoryScreen.js - Pantalla de Historial de Ubicaciones

## 📋 **¿Qué es este archivo?**
`LocationHistoryScreen.js` muestra el **historial de ubicaciones GPS** del usuario.

## 🎯 **Propósito**
- Ver historial de movimientos
- Filtrar por fechas
- Visualizar rutas en mapa
- Exportar datos GPS
- Análisis de tiempos

## 📱 **Componentes UI**

### **Selector de Fecha**
- DatePicker nativo
- Rango de fechas
- Shortcuts (hoy, ayer, semana)

### **Lista de Ubicaciones**
- FlatList optimizada
- Ícono según tipo (start/end/tracking)
- Hora y dirección
- Distancia desde anterior

### **Mapa de Ruta**
- Polyline con puntos GPS
- Marcadores start/end
- Animación de recorrido
- Zoom automático

### **Estadísticas**
- Tiempo total trabajado
- Distancia recorrida
- Ubicaciones visitadas
- Tiempo por ubicación

### **Exportación**
- Botón exportar CSV
- Selección de campos
- Envío por email

## 🔧 **Características**
- Carga incremental
- Cache de datos
- Modo offline
- Actualización real-time
