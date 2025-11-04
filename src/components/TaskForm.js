import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LocationRadiusSelector from './LocationRadiusSelector';
import SavedLocationsSelector from './SavedLocationsSelector';
import TaskTemplateSelector from './TaskTemplateSelector';

const { width } = Dimensions.get('window');

const TaskForm = ({ 
  initialData = {}, 
  onSubmit, 
  isEditing = false,
  formTitle = 'Add Task',
  showUserSelector
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Estados extraídos de TaskScreen
  const [fileNumber, setFileNumber] = useState(initialData.fileNumber || '');
  const [taskTitle, setTaskTitle] = useState(initialData.title || '');
  const [taskDescription, setTaskDescription] = useState(initialData.description || '');
  const [selectedUserIds, setSelectedUserIds] = useState(initialData.userIds || []);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showSavedLocationsSelector, setShowSavedLocationsSelector] = useState(false);
  const [taskLocation, setTaskLocation] = useState(initialData.location || null);
  const [taskRadius, setTaskRadius] = useState(initialData.radius || 1.0);
  const [taskLocationName, setTaskLocationName] = useState(initialData.locationName || '');
  const [handsFreeMode, setHandsFreeMode] = useState(initialData.handsFreeMode || false);
  const [taskKeywords, setTaskKeywords] = useState(
    initialData.keywords ? initialData.keywords.split(',').filter(k => k.trim()) : []
  );
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Estados para el selector de tiempo
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  
  // Efecto para inicializar el tiempo si hay timeLimit en los datos iniciales
  useEffect(() => {
    if (initialData.timeLimit) {
      const hours = Math.floor(initialData.timeLimit / 60);
      const minutes = initialData.timeLimit % 60;
      setSelectedHours(hours);
      setSelectedMinutes(minutes);
    }
  }, [initialData]);

  // Función para manejar la ubicación seleccionada desde LocationRadiusSelector
  const handleLocationSelected = (data) => {
    console.log('Datos de ubicación recibidos:', data);
    
    // Comprobar si recibimos un objeto con la estructura esperada
    if (data && data.location) {
      // Guardar directamente el objeto location en formato GeoJSON
      setTaskLocation(data.location);
      setTaskRadius(data.radius || 1.0);
      setTaskLocationName(data.locationName || '');
    } 
    // Mantener compatibilidad con el formato anterior por si acaso
    else if (data && data.latitude && data.longitude) {
      setTaskLocation({
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      });
      setTaskRadius(data.radius || 1.0);
      setTaskLocationName(data.locationName || '');
    } else {
      console.error('Formato de datos de ubicación no reconocido');
    }
    
    setShowLocationSelector(false);
  };

  // Función para manejar la selección de ubicaciones guardadas
  const handleSelectSavedLocation = (savedLocation) => {
    console.log('Ubicación guardada seleccionada:', savedLocation);
    
    if (savedLocation && savedLocation.location) {
      // Configurar la ubicación seleccionada
      setTaskLocation(savedLocation.location);
      setTaskRadius(savedLocation.radius || 1.0);
      setTaskLocationName(savedLocation.name || '');
      
      console.log('Ubicación establecida desde guardadas:', savedLocation.location);
    }
    
    setShowSavedLocationsSelector(false);
  };

  // Función para manejar la selección de plantillas de tareas
  const handleSelectTemplate = (template) => {
    console.log('Plantilla seleccionada:', template);
    
    if (!template) return;
    
    // Actualizar los campos del formulario con los datos de la plantilla
    setTaskTitle(template.title || '');
    setTaskDescription(template.description || '');
    
    // Actualizar ubicación si la plantilla tiene una
    if (template.location) {
      setTaskLocation(template.location);
      setTaskRadius(template.radius || 1.0);
      setTaskLocationName(template.locationName || '');
    }
    
    // Actualizar modo manos libres y palabras clave
    setHandsFreeMode(template.handsFreeMode || false);
    if (template.keywords) {
      // Manejar tanto si keywords es un array como si es un string
      let keywordsArray;
      if (Array.isArray(template.keywords)) {
        keywordsArray = template.keywords;
      } else if (typeof template.keywords === 'string') {
        keywordsArray = template.keywords.split(',').filter(k => k.trim());
      } else {
        keywordsArray = [];
      }
      setTaskKeywords(keywordsArray);
    }
    
    setShowTemplateSelector(false);
  };

  // Funciones para el selector de tiempo personalizado
  const showTimePicker = () => setTimePickerVisible(true);
  const hideTimePicker = () => setTimePickerVisible(false);
  
  // Funciones para incrementar/decrementar horas y minutos
  const incrementHours = () => setSelectedHours(prev => (prev + 1) % 24);
  const decrementHours = () => setSelectedHours(prev => (prev > 0 ? prev - 1 : 23));
  const incrementMinutes = () => {
    const newMinutes = (selectedMinutes + 5) % 60;
    setSelectedMinutes(newMinutes);
    if (newMinutes === 0) incrementHours();
  };
  const decrementMinutes = () => {
    const newMinutes = selectedMinutes === 0 ? 55 : selectedMinutes - 5;
    setSelectedMinutes(newMinutes);
    if (newMinutes === 55) decrementHours();
  };
  
  // Función para confirmar la selección de tiempo
  const confirmTimeSelection = () => {
    hideTimePicker();
  };
  
  // Formatear el tiempo seleccionado
  const formatSelectedTime = () => {
    if (selectedHours === 0 && selectedMinutes === 0) {
      return t('selectTimeLimit');
    }
    
    const formattedHours = selectedHours > 0 ? `${selectedHours}h ` : '';
    const formattedMinutes = selectedMinutes > 0 ? `${selectedMinutes}m` : '';
    return `${formattedHours}${formattedMinutes}`;
  };

  // Agregar una palabra clave
  const addKeyword = () => {
    if (currentKeyword.trim() && !taskKeywords.includes(currentKeyword.trim())) {
      setTaskKeywords([...taskKeywords, currentKeyword.trim()]);
      setCurrentKeyword('');
    }
  };

  // Eliminar una palabra clave
  const removeKeyword = (keyword) => {
    setTaskKeywords(taskKeywords.filter(k => k !== keyword));
  };

  // Manejar envío del formulario
  const handleSubmit = () => {
    // Validación de file number para administradores
    if (user?.isAdmin && !fileNumber.trim()) {
      Alert.alert(t('validationError'), t('fileNumberRequired') || 'Se requiere ingresar un número de archivo');
      return;
    }
    
    // Validación del título
    if (!taskTitle.trim()) {
      Alert.alert(t('validationError'), t('titleRequired'));
      return;
    }
    
    // Construir la estructura de ubicación para la tarea si hay ubicación seleccionada
    let locationData = null;
    if (taskLocation && taskLocation.coordinates) {
      // Si taskLocation ya tiene el formato correcto (type y coordinates)
      locationData = taskLocation;
    } else if (taskLocation && taskLocation.latitude && taskLocation.longitude) {
      // Si taskLocation tiene formato de coordenadas planas
      locationData = {
        type: 'Point',
        coordinates: [taskLocation.longitude, taskLocation.latitude]
      };
    }
    
    // Crear objeto de tarea con los datos del formulario
    const taskData = {
      fileNumber: fileNumber.trim(),
      title: taskTitle,
      description: taskDescription,
      userId: selectedUserIds.length > 0 ? selectedUserIds[0] : null,
      userIds: selectedUserIds,
      handsFreeMode: handsFreeMode,
      keywords: taskKeywords.join(','),
      radius: parseFloat(taskRadius) || 1.0,
      locationName: taskLocationName || '',
      location: locationData
    };
    
    // Añadir tiempo límite si está seleccionado
    if (selectedHours > 0 || selectedMinutes > 0) {
      // Convertir horas y minutos a un valor total en minutos
      const totalMinutes = (selectedHours * 60) + selectedMinutes;
      taskData.timeLimit = totalMinutes;
    }

    // Si estamos en modo edición, asegurarnos de mantener el ID de la tarea
    if (isEditing && initialData._id) {
      taskData._id = initialData._id;
    }
    
    // Llamar a la función de envío proporcionada por el componente padre
    onSubmit(taskData);
  };

  // Renderizar el selector de tiempo personalizado
  const renderCustomTimePicker = () => {
    return (
      <Modal
        transparent={true}
        visible={isTimePickerVisible}
        animationType="fade"
        onRequestClose={hideTimePicker}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={hideTimePicker}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.timePickerContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.timePickerTitle}>{t('selectTimeLimit')}</Text>
            
            <View style={styles.timePickerControls}>
              {/* Selector de horas */}
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>{t('hours')}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={incrementHours}>
                  <Ionicons name="chevron-up" size={30} color="#fff3e5" />
                </TouchableOpacity>
                
                <Text style={styles.timeValue}>{selectedHours.toString().padStart(2, '0')}</Text>
                
                <TouchableOpacity style={styles.timeButton} onPress={decrementHours}>
                  <Ionicons name="chevron-down" size={30} color="#fff3e5" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              {/* Selector de minutos */}
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>{t('minutes')}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={incrementMinutes}>
                  <Ionicons name="chevron-up" size={30} color="#fff3e5" />
                </TouchableOpacity>
                
                <Text style={styles.timeValue}>{selectedMinutes.toString().padStart(2, '0')}</Text>
                
                <TouchableOpacity style={styles.timeButton} onPress={decrementMinutes}>
                  <Ionicons name="chevron-down" size={30} color="#fff3e5" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.timePickerActions}>
              <TouchableOpacity style={styles.timePickerCancel} onPress={hideTimePicker}>
                <Text style={styles.timePickerCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.timePickerConfirm} onPress={confirmTimeSelection}>
                <Text style={styles.timePickerConfirmText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <Text style={styles.formTitle}>{formTitle}</Text>
      
      {/* Campo de File Number (solo para administradores) - Movido arriba */}
      {user?.isAdmin && (
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, {marginTop: -35, fontWeight: 'bold', marginBottom: 5}]}>{t('fileNumber') || 'Número de archivo'}</Text>
          <TextInput
            style={[styles.input, {color: '#fff3e5'}]}
            placeholder={t('enterFileNumber') || 'Ingrese el número de archivo'}
            placeholderTextColor="#a8a8a8"
            value={fileNumber}
            onChangeText={setFileNumber}
          />
        </View>
      )}
      
      <Text style={[styles.inputLabel, {marginTop: -15, fontWeight: 'bold'}]}>{t('taskTitle') || 'Título de la tarea'}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('taskTitle')}
        value={taskTitle}
        onChangeText={setTaskTitle}
        placeholderTextColor="#a8a8a8"
      />
      
      <Text style={[styles.inputLabel, {marginTop: 5, fontWeight: 'bold'}]}>{t('taskDescription') || 'Descripción'}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={t('taskDescription')}
        value={taskDescription}
        onChangeText={setTaskDescription}
        multiline={true}
        numberOfLines={3}
        placeholderTextColor="#a8a8a8"
      />
      
      {/* Botón para seleccionar usuarios (solo para administradores) */}
      {user?.isAdmin && (
        <View style={styles.sectionContainer}>
          <Text style={[styles.inputLabel, {marginTop: 5, fontWeight: 'bold'}]}>{t('assignUsers') || 'Asignar usuarios'}</Text>
          <TouchableOpacity 
            style={styles.userSelectorButton}
            onPress={() => showUserSelector && showUserSelector()}
          >
            <Ionicons name="people" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.userSelectorButtonText}>
              {selectedUserIds.length > 0 ? 
                `${t('assignedUsers') || 'Usuarios asignados'}: ${selectedUserIds.length}` : 
                t('selectUsers') || 'Seleccionar usuarios'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Campo para tiempo límite (solo para administradores) */}
      {user?.isAdmin && (
        <View style={styles.timeLimitContainer}>
          <Ionicons name="timer-outline" size={20} color="#fff3e5" style={styles.timeLimitIcon} />
          <TouchableOpacity 
            style={styles.timePicker} 
            onPress={showTimePicker}
          >
            <Text style={styles.timePickerText}>
              {formatSelectedTime()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#fff3e5" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Contenedor principal para botones de ubicación */}
      <View style={{marginBottom: 15}}>
        {/* Botón para seleccionar ubicación */}
        <View style={styles.locationContainer}>
          <TouchableOpacity 
            style={[styles.locationButton, {paddingVertical: 10, paddingHorizontal: 8, flex: 1}]}
            onPress={() => setShowLocationSelector(true)}
          >
            <Ionicons name="location" size={22} color="#fff3e5" style={{marginRight: 6}} />
            <Text style={[styles.locationButtonText, { color: '#fff3e5' }]}>
              {taskLocation 
                ? `${taskLocationName || t('selectedLocation')} (${taskRadius} km)` 
                : t('addLocationAndRadius')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Contenedor para botones adicionales */}
        <View style={{flexDirection: 'column', marginTop: -8, gap: 8}}>
          {/* Botón para seleccionar ubicaciones guardadas */}
          <TouchableOpacity 
            style={[styles.savedLocationsButton, { backgroundColor: '#fff3e5', paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderRadius: 8 }]}
            onPress={() => setShowSavedLocationsSelector(true)}
          >
            <Ionicons name="bookmark" size={22} color="#000000" style={{marginRight: 6}} />
            <Text style={{color: '#000000', fontWeight: 'bold', fontSize: 14}}>{t('savedLocations') || 'Guardadas'}</Text>
          </TouchableOpacity>
          
          {/* Botón para plantillas de tareas (solo para administradores) */}
          {user?.isAdmin && (
            <TouchableOpacity 
              style={[styles.templateButton, { backgroundColor: '#fff3e5', paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderRadius: 8 }]}
              onPress={() => setShowTemplateSelector(true)}
            >
              <Ionicons name="copy-outline" size={22} color="#000000" style={{marginRight: 6}} />
              <Text style={{color: '#000000', fontWeight: 'bold', fontSize: 14}}>{t('templates') || 'Plantillas'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Opción de Modo Manos Libres */}
      <View style={styles.handsFreeContainer}>
        <View style={styles.handsFreeTextContainer}>
          <Ionicons name="mic-outline" size={20} color="#fff3e5" />
          <Text style={[styles.handsFreeText, { color: '#fff3e5' }]}>{t('handsFreeMode')}</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.handsFreeSwitch, 
            handsFreeMode ? { backgroundColor: '#fff3e5' } : styles.handsFreeInactive
          ]}
          onPress={() => setHandsFreeMode(!handsFreeMode)}
        >
          <View style={[
            styles.handsFreeHandle,
            handsFreeMode ? { backgroundColor: '#000000' } : styles.handsFreeHandleInactive
          ]} />
        </TouchableOpacity>
      </View>
      
      {/* Campo para palabras clave solo si handsFreeMode está activado */}
      {handsFreeMode && (
        <View style={styles.keywordsContainer}>
          <Text style={[styles.keywordsLabel, { color: '#fff3e5' }]}>{t('voiceKeywords') || 'Palabras clave para activación por voz'}</Text>
          
          <View style={styles.keywordInputRow}>
            <TextInput
              style={[styles.input, styles.keywordInput, { color: '#fff3e5', borderColor: '#fff3e5' }]}
              placeholder={t('keywordPlaceholder') || "Escriba una palabra clave"}
              value={currentKeyword}
              onChangeText={setCurrentKeyword}
              placeholderTextColor="#a8a8a8"
            />
            <TouchableOpacity 
              style={[styles.addKeywordButton, {marginTop: -16}]}
              onPress={addKeyword}
            >
              <Text style={styles.addKeywordButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          
          {taskKeywords.length > 0 && (
            <View style={styles.keywordsList}>
              <Text style={[styles.keywordsListTitle, { color: '#fff3e5' }]}>{t('currentKeywords')}:</Text>
              <View style={styles.keywordTags}>
                {taskKeywords.map((keyword, index) => (
                  <View key={index} style={styles.keywordTag}>
                    <Text style={styles.keywordTagText}>{keyword}</Text>
                    <TouchableOpacity 
                      style={styles.removeKeywordButton}
                      onPress={() => removeKeyword(keyword)}
                    >
                      <Text style={styles.removeKeywordButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
      
      {/* Botón de envío del formulario */}
      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>{isEditing ? t('updateTask') : t('addTask')}</Text>
      </TouchableOpacity>
      
      {/* Renderizar los selectores modales */}
      {renderCustomTimePicker()}
      
      {showLocationSelector && (
        <LocationRadiusSelector 
          visible={showLocationSelector}
          onClose={() => setShowLocationSelector(false)}
          onSave={handleLocationSelected}
          initialLocation={taskLocation}
          initialRadius={taskRadius}
        />
      )}
      
      {showSavedLocationsSelector && (
        <SavedLocationsSelector 
          visible={showSavedLocationsSelector}
          onClose={() => setShowSavedLocationsSelector(false)}
          onSelect={handleSelectSavedLocation}
        />
      )}
      
      {showTemplateSelector && (
        <TaskTemplateSelector 
          visible={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelectTemplate={handleSelectTemplate}
          currentTask={{
            title: taskTitle,
            description: taskDescription,
            location: taskLocation,
            radius: taskRadius,
            locationName: taskLocationName,
            timeLimit: (selectedHours * 60) + selectedMinutes,
            keywords: taskKeywords,
            handsFreeMode: handsFreeMode,
      
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 15,
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff3e5',
    textAlign: 'center'
  },
  sectionContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff3e5',
    fontWeight: 'bold',
  },
  userSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 243, 229, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonIcon: {
    marginRight: 10,
  },
  userSelectorButtonText: {
    color: '#fff3e5',
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#fff3e5',
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff3e5',
    color: '#fff3e5',
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#000000',
    borderRadius: 8,
    padding: 12,
  },
  locationButtonText: {
    color: '#fff3e5',
    marginLeft: 8,
    flex: 1,
  },
  handsFreeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  handsFreeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handsFreeText: {
    fontSize: 16,
    color: '#fff3e5',
    marginLeft: 5,
  },
  handsFreeSwitch: {
    width: 50,
    height: 25,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handsFreeInactive: {
    backgroundColor: '#f0f0f0',
  },
  handsFreeHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  handsFreeHandleActive: {
    marginLeft: 25,
  },
  handsFreeHandleInactive: {
    marginLeft: 5,
  },
  keywordsContainer: {
    marginBottom: 15,
  },
  keywordsLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  keywordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  keywordInput: {
    flex: 1,
    height: 40,
    marginRight: 10,
  },
  addKeywordButton: {
    backgroundColor: '#fff3e5',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0, // Asegura que no haya margen superior
  },
  addKeywordButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 26,
    textAlign: 'center',
    paddingBottom: 2,
  },
  keywordsList: {
    marginTop: 5,
  },
  keywordsListTitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  keywordTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  keywordTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1f5fe',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  keywordTagText: {
    color: '#0277bd',
    marginRight: 5,
  },
  removeKeywordButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0277bd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeKeywordButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeLimitIcon: {
    marginRight: 10,
  },
  timePicker: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff3e5',
  },
  timePickerText: {
    color: '#fff3e5',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#fff3e5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Estilos para el selector de tiempo personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    width: '80%',
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  timePickerTitle: {
    color: '#fff3e5',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  timePickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timePickerColumn: {
    alignItems: 'center',
    width: 80,
  },
  timePickerLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  timeButton: {
    padding: 10,
  },
  timeValue: {
    color: '#fff3e5',
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  timeSeparator: {
    color: '#fff3e5',
    fontSize: 30,
    marginHorizontal: 10,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  timePickerCancel: {
    padding: 10,
  },
  timePickerCancelText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  timePickerConfirm: {
    padding: 10,
  },
  timePickerConfirmText: {
    color: '#fff3e5',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TaskForm;
