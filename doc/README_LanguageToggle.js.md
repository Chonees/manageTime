# README: src/components/LanguageToggle.js - Componente Cambio de Idioma

## 📋 **¿Qué es este archivo?**
`LanguageToggle.js` es el **componente para cambiar idioma** de la aplicación.

## 🎯 **Propósito**
- Cambio rápido de idioma
- Indicador visual del idioma actual
- Persistencia de preferencia
- Integración con LanguageContext

## 📱 **Componentes UI**

### **Toggle Button**
- Botones ES/EN
- Estado activo visual
- Banderas como íconos
- Animación de cambio

### **Variantes**
- Botones separados
- Switch toggle
- Dropdown selector
- Íconos únicamente

### **Estados**
- Idioma actual destacado
- Transición suave
- Loading durante cambio
- Confirmación visual

## 🔧 **Props**
- style: Estilos personalizados
- size: Tamaño (small/medium/large)
- variant: Tipo de toggle
- showLabels: Mostrar texto

## ⚡ **Funcionalidad**
- Usa LanguageContext
- Cambio instantáneo
- Persiste en AsyncStorage
- Actualiza toda la app

## 🎨 **Estilos**
- Colores temáticos
- Bordes redondeados
- Sombras sutiles
- Responsive
