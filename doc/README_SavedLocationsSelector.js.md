# README: src/components/SavedLocationsSelector.js - Selector de Ubicaciones Guardadas

## 📋 **¿Qué es este archivo?**
`SavedLocationsSelector.js` permite **seleccionar ubicaciones guardadas** para tareas.

## 🎯 **Propósito**
- Mostrar ubicaciones favoritas
- Selección rápida
- Gestionar ubicaciones guardadas
- Crear nuevas ubicaciones

## 📱 **Componentes UI**

### **Lista de Ubicaciones**
- FlatList con ubicaciones
- Nombre descriptivo
- Dirección aproximada
- Distancia desde ubicación actual

### **Información de Ubicación**
- Coordenadas
- Radio configurado
- Última vez usada
- Descripción

### **Mapa Preview**
- Ubicación en mapa
- Radio visual
- Marcador personalizado
- Zoom automático

### **Acciones**
- Seleccionar ubicación
- Editar ubicación
- Eliminar ubicación
- Marcar como favorita

### **Crear Nueva**
- Botón agregar
- Usar ubicación actual
- Buscar dirección
- Configurar radio

## 🔧 **Props**
- onSelect: Callback al seleccionar
- onClose: Cerrar selector
- currentLocation: Ubicación actual
- showDistance: Mostrar distancias

## ⚡ **Características**
- Ordenamiento por distancia
- Búsqueda por nombre
- Geocoding inverso
- Límite de 20 ubicaciones
