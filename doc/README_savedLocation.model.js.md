# README: backend/src/models/savedLocation.model.js - Modelo de Ubicaciones Guardadas

## 📋 **¿Qué es este archivo?**
`savedLocation.model.js` almacena **ubicaciones favoritas/frecuentes** de los usuarios para reutilización rápida.

## 🎯 **Propósito**
- Guardar ubicaciones frecuentes
- Evitar reingreso de coordenadas
- Asociar nombres descriptivos a lugares
- Configurar radios personalizados

## 📖 **Campos del Modelo**
- **userId**: Usuario propietario (ObjectId, requerido)
- **name**: Nombre del lugar ("Oficina Central", etc.)
- **location**: GeoJSON Point con coordenadas
- **radius**: Radio en kilómetros
- **description**: Descripción adicional
- **isDefault**: Si es ubicación por defecto
- **timestamps**: createdAt y updatedAt

## 🔧 **Características**
- Índice geoespacial 2dsphere
- Máximo 20 ubicaciones por usuario
- Nombres únicos por usuario
