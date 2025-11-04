# README: src/screens/TaskScreen.js - Pantalla de Gestión de Tareas

## 📋 **¿Qué es este archivo?**

`TaskScreen.js` es la **pantalla central de gestión de tareas** en ManageTime. Permite a los usuarios crear tareas con geolocalización, asignar tareas a múltiples usuarios (admin), establecer límites de tiempo, configurar modo manos libres con keywords, usar plantillas predefinidas y gestionar ubicaciones guardadas. Es una de las pantallas más complejas con múltiples modales y selectores.

## 🎯 **Propósito**
- Crear tareas nuevas con todos los parámetros
- Asignar tareas a usuarios (función admin)
- Configurar geolocalización con radio de acción
- Establecer límites de tiempo personalizados
- Habilitar modo manos libres con palabras clave
- Usar plantillas de tareas predefinidas
- Gestionar ubicaciones guardadas
- Filtrar y buscar tareas existentes
- Pull-to-refresh para actualización

## ⚡ **¿Cómo funciona?**

La pantalla gestiona **múltiples flujos de trabajo**:
1. **Creación de tareas** con formulario completo
2. **Selección de ubicación** via mapa o guardadas
3. **Configuración de tiempo** con selector custom
4. **Asignación múltiple** a varios usuarios
5. **Plantillas** para tareas recurrentes
6. **Búsqueda y filtrado** de tareas existentes

---

## 📖 **Estructura del Componente**

### **Líneas 1-28: Importaciones**
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator, Modal, ScrollView, StatusBar, SafeAreaView, Dimensions, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import LanguageToggle from '../components/LanguageToggle';
import * as api from '../services/api';
import LocationRadiusSelector from '../components/LocationRadiusSelector';
import SavedLocationsSelector from '../components/SavedLocationsSelector';
import TaskTemplateSelector from '../components/TaskTemplateSelector';
import TaskForm from '../components/TaskForm';
```
- **React Native Core**: Todos los componentes UI necesarios
- **Contextos**: Auth, Language, Theme
- **Componentes custom**: Selectores especializados
- **TaskForm**: Formulario modular de tareas

### **Líneas 32-63: Estado del Componente**
```javascript
const TaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  
  // Estados principales
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados del formulario
  const [fileNumber, setFileNumber] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null); // Legacy
  
  // Estados de modales
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showSavedLocationsSelector, setShowSavedLocationsSelector] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Estados de ubicación
  const [taskLocation, setTaskLocation] = useState(null);
  const [taskRadius, setTaskRadius] = useState(1.0);
  const [taskLocationName, setTaskLocationName] = useState('');
  
  // Estados de modo manos libres
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [taskKeywords, setTaskKeywords] = useState([]);
  const [currentKeyword, setCurrentKeyword] = useState('');
  
  // Estados de tiempo
  const [taskTimeLimit, setTaskTimeLimit] = useState('');
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  
  // Estados de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
```

---

## 🔄 **Pull to Refresh**

### **Líneas 66-75: Función onRefresh**
```javascript
const onRefresh = async () => {
  setRefreshing(true);
  try {
    await loadTasks();
  } catch (error) {
    console.error('Error refreshing data:', error);
  } finally {
    setRefreshing(false);
  }
};
```
- **Pull-to-refresh**: Actualización manual de tareas
- **Loading state**: Indicador visual durante refresh

---

## 📍 **Gestión de Ubicación**

### **Líneas 78-107: handleLocationSelected**
```javascript
const handleLocationSelected = (data) => {
  console.log('Datos de ubicación recibidos:', data);
  
  // Formato esperado de LocationRadiusSelector
  if (data && data.location) {
    setTaskLocation(data.location);  // GeoJSON Point
    setTaskRadius(data.radius || 1.0);
    setTaskLocationName(data.locationName || '');
    
    console.log('Ubicación guardada:', data.location);
    console.log('Radio guardado:', data.radius);
    console.log('Nombre guardado:', data.locationName);
  } 
  // Compatibilidad con formato anterior
  else if (data && data.latitude && data.longitude) {
    setTaskLocation({
      type: 'Point',
      coordinates: [data.longitude, data.latitude]
    });
    setTaskRadius(data.radius || 1.0);
    setTaskLocationName(data.locationName || '');
  } else {
    console.warn('Formato de ubicación no reconocido:', data);
    setTaskLocation(null);
  }
  
  setShowLocationSelector(false);
};
```
- **Doble formato**: GeoJSON o lat/lng
- **Radio configurable**: En kilómetros
- **Nombre descriptivo**: Para UI

### **Líneas 110-127: handleSelectSavedLocation**
```javascript
const handleSelectSavedLocation = (savedLocation) => {
  if (savedLocation && savedLocation.location && savedLocation.location.coordinates) {
    const [lng, lat] = savedLocation.location.coordinates;
    
    setTaskLocation(savedLocation.location);
    setTaskRadius(savedLocation.radius || 1.0);
    setTaskLocationName(savedLocation.name || '');
    
    setShowLocationSelector(false);
  } else {
    console.warn('La ubicación guardada no tiene coordenadas válidas');
  }
};
```
- **Ubicaciones guardadas**: Reutilización de lugares frecuentes
- **Formato GeoJSON**: Consistente con backend

---

## 📝 **Plantillas de Tareas**

### **Líneas 130-160: handleSelectTemplate**
```javascript
const handleSelectTemplate = (template) => {
  console.log('Plantilla de tarea seleccionada:', template);
  
  if (template) {
    // Aplicar datos de la plantilla
    if (template.title) setNewTaskTitle(template.title);
    if (template.description) setNewTaskDescription(template.description);
    
    // Convertir timeLimit a horas y minutos
    if (template.timeLimit) {
      const hours = Math.floor(template.timeLimit / 60);
      const minutes = template.timeLimit % 60;
      setSelectedHours(hours);
      setSelectedMinutes(minutes);
    }
    
    // Procesar keywords
    if (template.keywords && Array.isArray(template.keywords)) {
      setTaskKeywords(template.keywords);
    } else if (template.keywords && typeof template.keywords === 'string') {
      setTaskKeywords(template.keywords.split(',').map(k => k.trim()).filter(k => k));
    }
    
    // Si tiene ubicación
    if (template.location) {
      setTaskLocation(template.location);
      setTaskRadius(template.radius || 1.0);
      setTaskLocationName(template.locationName || '');
    }
    
    setShowTemplateSelector(false);
  }
};
```
- **Relleno automático**: De todos los campos
- **Conversión de tiempo**: Minutos → horas/minutos
- **Keywords flexibles**: Array o string separado por comas

---

## 🕐 **Selector de Tiempo Personalizado**

### **Componente TimePicker**
```javascript
<Modal visible={isTimePickerVisible} transparent animationType="slide">
  <View style={styles.timePickerModal}>
    <Text style={styles.timePickerTitle}>{t('selectTimeLimit')}</Text>
    
    <View style={styles.timePickerRow}>
      {/* Selector de horas */}
      <View style={styles.timePickerColumn}>
        <Text>{t('hours')}</Text>
        <ScrollView style={styles.timeScroll}>
          {[...Array(24)].map((_, i) => (
            <TouchableOpacity 
              key={i} 
              onPress={() => setSelectedHours(i)}
              style={[styles.timeOption, selectedHours === i && styles.selectedTimeOption]}
            >
              <Text>{i}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Selector de minutos */}
      <View style={styles.timePickerColumn}>
        <Text>{t('minutes')}</Text>
        <ScrollView style={styles.timeScroll}>
          {[0, 15, 30, 45].map(min => (
            <TouchableOpacity 
              key={min} 
              onPress={() => setSelectedMinutes(min)}
              style={[styles.timeOption, selectedMinutes === min && styles.selectedTimeOption]}
            >
              <Text>{min}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
    
    <TouchableOpacity onPress={confirmTimeSelection}>
      <Text>{t('confirm')}</Text>
    </TouchableOpacity>
  </View>
</Modal>
```
- **Selector dual**: Horas (0-23) y minutos (0, 15, 30, 45)
- **Conversión**: A minutos totales para backend
- **UI custom**: Mejor UX que picker nativo

---

## 👥 **Selector de Usuarios (Admin)**

### **Modal de Selección Múltiple**
```javascript
<Modal visible={showUserSelector} transparent>
  <View style={styles.modalContainer}>
    <View style={styles.userSelectorModal}>
      <Text style={styles.modalTitle}>{t('selectUsers')}</Text>
      
      <FlatList
        data={users}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.userItem,
              selectedUserIds.includes(item._id) && styles.selectedUserItem
            ]}
            onPress={() => toggleUserSelection(item._id)}
          >
            <View style={styles.checkbox}>
              {selectedUserIds.includes(item._id) && (
                <Ionicons name="checkmark" size={20} color="#fff3e5" />
              )}
            </View>
            <Text style={styles.userName}>{item.username}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </TouchableOpacity>
        )}
      />
      
      <TouchableOpacity onPress={confirmUserSelection}>
        <Text>{t('assignToSelected')} ({selectedUserIds.length})</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```
- **Selección múltiple**: Checkbox para cada usuario
- **Contador**: Muestra cantidad seleccionada
- **Solo admin**: Verificación de permisos

---

## 🎤 **Modo Manos Libres**

### **Configuración de Keywords**
```javascript
<View style={styles.handsFreeSection}>
  <TouchableOpacity 
    onPress={() => setHandsFreeMode(!handsFreeMode)}
    style={styles.handsFreeToggle}
  >
    <Ionicons 
      name={handsFreeMode ? "checkbox" : "square-outline"} 
      size={24} 
    />
    <Text>{t('enableHandsFreeMode')}</Text>
  </TouchableOpacity>
  
  {handsFreeMode && (
    <View style={styles.keywordsContainer}>
      <Text>{t('voiceActivationKeywords')}</Text>
      
      <View style={styles.keywordInput}>
        <TextInput
          value={currentKeyword}
          onChangeText={setCurrentKeyword}
          placeholder={t('enterKeyword')}
          onSubmitEditing={addKeyword}
        />
        <TouchableOpacity onPress={addKeyword}>
          <Ionicons name="add-circle" size={24} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.keywordsList}>
        {taskKeywords.map((keyword, index) => (
          <View key={index} style={styles.keywordChip}>
            <Text>{keyword}</Text>
            <TouchableOpacity onPress={() => removeKeyword(index)}>
              <Ionicons name="close-circle" size={20} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  )}
</View>
```
- **Toggle activación**: Habilita/deshabilita modo
- **Keywords personalizadas**: Para activación por voz
- **Chips visuales**: Muestra keywords agregadas
- **Gestión dinámica**: Agregar/eliminar keywords

---

## 📤 **Creación de Tarea**

### **Función handleCreateTask**
```javascript
const handleCreateTask = async () => {
  // Validaciones
  if (!fileNumber.trim()) {
    Alert.alert(t('error'), t('fileNumberRequired'));
    return;
  }
  
  if (!newTaskTitle.trim()) {
    Alert.alert(t('error'), t('titleRequired'));
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const taskData = {
      fileNumber: fileNumber.trim(),
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      
      // Ubicación (si se configuró)
      ...(taskLocation && {
        location: taskLocation,
        radius: taskRadius,
        locationName: taskLocationName
      }),
      
      // Tiempo límite
      ...(selectedHours > 0 || selectedMinutes > 0) && {
        timeLimit: (selectedHours * 60) + selectedMinutes
      },
      
      // Modo manos libres
      handsFreeMode,
      ...(handsFreeMode && taskKeywords.length > 0) && {
        keywords: taskKeywords.join(', ')
      },
      
      // Usuarios asignados (admin)
      ...(user.isAdmin && selectedUserIds.length > 0) && {
        userIds: selectedUserIds,
        userId: selectedUserIds[0] // Compatibilidad
      }
    };
    
    // Endpoint diferente si es admin asignando
    const endpoint = user.isAdmin && selectedUserIds.length > 0 
      ? api.createAssignedTask 
      : api.createTask;
    
    const response = await endpoint(taskData);
    
    Alert.alert(t('success'), t('taskCreated'));
    resetForm();
    setShowAddForm(false);
    await loadTasks();
    
  } catch (error) {
    console.error('Error creando tarea:', error);
    Alert.alert(t('error'), error.message);
  } finally {
    setIsSubmitting(false);
  }
};
```
- **Validación completa**: FileNumber y título requeridos
- **Construcción dinámica**: Solo incluye campos configurados
- **Endpoint condicional**: Diferente para admin
- **Reset automático**: Limpia form tras éxito

---

## 🔍 **Búsqueda y Filtrado**

### **Función de Filtrado**
```javascript
useEffect(() => {
  if (searchText) {
    const filtered = tasks.filter(task => 
      task.title.toLowerCase().includes(searchText.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      task.fileNumber?.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredTasks(filtered);
  } else {
    setFilteredTasks(tasks);
  }
}, [searchText, tasks]);
```
- **Búsqueda en 3 campos**: Título, descripción, fileNumber
- **Case insensitive**: Búsqueda sin distinción mayúsculas
- **Tiempo real**: Actualización inmediata

---

## 📱 **Lista de Tareas**

### **Renderizado de Items**
```javascript
const renderTaskItem = ({ item }) => (
  <TouchableOpacity 
    style={styles.taskCard}
    onPress={() => navigation.navigate('TaskDetails', { taskId: item._id })}
  >
    <View style={styles.taskHeader}>
      <Text style={styles.taskTitle}>{item.title}</Text>
      {item.timeLimit && (
        <View style={styles.timeBadge}>
          <Ionicons name="time-outline" size={16} />
          <Text>{formatTimeLimit(item.timeLimit)}</Text>
        </View>
      )}
    </View>
    
    <Text style={styles.taskFileNumber}>#{item.fileNumber}</Text>
    
    {item.description && (
      <Text style={styles.taskDescription} numberOfLines={2}>
        {item.description}
      </Text>
    )}
    
    <View style={styles.taskFooter}>
      {item.location && (
        <View style={styles.locationBadge}>
          <Ionicons name="location-outline" size={14} />
          <Text>{item.locationName || t('hasLocation')}</Text>
        </View>
      )}
      
      {item.handsFreeMode && (
        <View style={styles.handsFreeeBadge}>
          <Ionicons name="mic-outline" size={14} />
        </View>
      )}
      
      {item.userIds?.length > 1 && (
        <View style={styles.multiUserBadge}>
          <Ionicons name="people-outline" size={14} />
          <Text>{item.userIds.length}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);
```
- **Card diseño**: Información jerarquizada
- **Badges visuales**: Tiempo, ubicación, modo voz
- **Navegación**: Tap para ver detalles
- **Límite líneas**: Descripción truncada

---

## 🚨 **Validaciones y Permisos**

### **Verificaciones de Admin:**
```javascript
// Solo mostrar selector de usuarios si es admin
{user.isAdmin && (
  <TouchableOpacity onPress={() => setShowUserSelector(true)}>
    <Ionicons name="people" size={24} />
    <Text>{t('assignToUsers')}</Text>
  </TouchableOpacity>
)}

// Solo puede crear plantillas si es admin
{user.isAdmin && (
  <TouchableOpacity onPress={saveAsTemplate}>
    <Text>{t('saveAsTemplate')}</Text>
  </TouchableOpacity>
)}
```

### **Validaciones de Campos:**
- **FileNumber**: Siempre requerido
- **Título**: Siempre requerido  
- **Ubicación**: Opcional pero valida formato
- **Tiempo**: Mínimo 1 minuto si se establece
- **Keywords**: Al menos una si modo manos libres

---

## 📊 **Estados de Carga**

```javascript
// Loading inicial
if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#fff3e5" />
      <Text>{t('loadingTasks')}</Text>
    </View>
  );
}

// Durante creación
{isSubmitting && (
  <View style={styles.overlay}>
    <ActivityIndicator size="large" />
    <Text>{t('creatingTask')}</Text>
  </View>
)}
```

---

## 📝 **Notas Importantes**

- **FileNumber crítico**: Validación estricta
- **Multi-usuario**: Solo admins pueden asignar
- **GeoJSON format**: Consistencia con backend
- **Plantillas**: Reutilización eficiente
- **Modo manos libres**: Para trabajos especiales
- **Pull-to-refresh**: Actualización manual

Esta pantalla es el **centro de creación de tareas** y debe manejar múltiples configuraciones complejas de forma intuitiva.
