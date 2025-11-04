# README: src/screens/VoiceAssistantScreen.js - Pantalla del Asistente de Voz

## 📋 **¿Qué es este archivo?**
`VoiceAssistantScreen.js` implementa el **asistente de voz** para notas y comandos.

## 🎯 **Propósito**
- Captura de notas por voz
- Comandos manos libres
- Transcripción en tiempo real
- Asociación con tareas
- Activación por keywords

## 📱 **Componentes UI**

### **Botón de Activación**
- Micrófono grande central
- Animación al hablar
- Estados: idle/listening/processing
- Feedback visual y sonoro

### **Transcripción**
- Texto en tiempo real
- Correcciones automáticas
- Confirmación antes de guardar
- Edición manual posible

### **Keywords**
- Lista de palabras activación
- "Hola", "Nota", custom
- Indicador de detección
- Configurables por tarea

### **Estado de Tarea**
- Muestra tarea activa
- Asociación automática
- Cambio de tarea posible

### **Historial**
- Últimas notas de voz
- Reproducción de audio
- Transcripciones guardadas

## 🔧 **Características**
- Expo Speech API
- Activación continua
- Modo background
- Multi-idioma (ES/EN)
