# README: src/components/MapComponent.js - Componente de Mapa Reutilizable

## 📋 **¿Qué es este archivo?**
`MapComponent.js` es un **componente de mapa reutilizable** para toda la aplicación.

## 🎯 **Propósito**
- Mapa base configurable
- Marcadores personalizables
- Eventos de interacción
- Estilos consistentes

## 📱 **Componentes UI**

### **MapView Base**
- Google Maps (Android)
- Apple Maps (iOS)
- Configuración automática
- Estilos personalizados

### **Marcadores**
- Ubicación del usuario
- Puntos de interés
- Tareas con ubicación
- Ubicaciones guardadas

### **Overlays**
- Círculos de radio
- Polylines de rutas
- Polígonos de áreas
- Heatmaps opcionales

### **Controles**
- Botón mi ubicación
- Zoom controls
- Compass
- Traffic layer

### **Interacciones**
- Tap en mapa
- Drag markers
- Long press
- Zoom gestures

## 🔧 **Props**
- initialRegion: Región inicial
- markers: Array de marcadores
- onMapPress: Callback tap
- showsUserLocation: Mostrar usuario
- customStyle: Estilos custom

## ⚡ **Características**
- Auto-fit a marcadores
- Animaciones suaves
- Clustering de marcadores
- Offline tiles básico
