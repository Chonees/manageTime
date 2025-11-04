# README: src/components/AdminActivityList.js - Lista de Actividades Admin

## 📋 **¿Qué es este archivo?**
`AdminActivityList.js` es el **componente de lista de actividades** para administradores.

## 🎯 **Propósito**
- Mostrar actividades del sistema
- Filtros y búsqueda
- Vista detallada
- Acciones administrativas

## 📱 **Componentes UI**

### **Lista Principal**
- FlatList optimizada
- Íconos por tipo de actividad
- Información del usuario
- Timestamp relativo

### **Item de Actividad**
- Avatar del usuario
- Tipo de actividad con ícono
- Descripción breve
- Tiempo relativo
- Estado visual

### **Filtros**
- Por tipo de actividad
- Por usuario
- Por rango de fechas
- Por estado

### **Búsqueda**
- SearchBar integrada
- Búsqueda en tiempo real
- Filtros combinables
- Historial de búsquedas

### **Acciones**
- Ver detalles completos
- Filtrar por usuario
- Exportar datos
- Refresh manual

## 🔧 **Props**
- activities: Array de actividades
- onRefresh: Callback refresh
- onFilter: Callback filtros
- loading: Estado de carga
- onItemPress: Tap en item

## ⚡ **Características**
- Paginación infinita
- Pull-to-refresh
- Cache inteligente
- Indicadores de carga
