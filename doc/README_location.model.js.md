# README: backend/src/models/location.model.js - Modelo de Ubicaciones GPS

## 📋 **¿Qué es este archivo?**
`location.model.js` es el **modelo de tracking GPS** de ManageTime. Almacena historial de ubicaciones de usuarios.

## 🎯 **Propósito**
- Registrar ubicaciones de inicio/fin de jornada
- Almacenar tracking continuo de posición
- Mantener historial completo de movimientos

## 📖 **Campos del Modelo**
- **userId**: Referencia al usuario (ObjectId, requerido)
- **type**: Tipo de ubicación ('start'/'end'/'tracking')
- **latitude**: Coordenada latitud (Number, requerido)
- **longitude**: Coordenada longitud (Number, requerido)
- **description**: Descripción opcional (String)
- **timestamp**: Momento del registro (Date, automático)

## 🗺️ **Índices**
- Compuesto: `{ userId: 1, timestamp: -1 }` para historial
- Geoespacial: `{ longitude: 1, latitude: 1 }` tipo 2d
