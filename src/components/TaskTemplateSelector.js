import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import * as api from '../services/api';

const TaskTemplateSelector = ({ 
  visible, 
  onClose, 
  onSelectTemplate, 
  onSaveTemplate,
  currentTask = {} 
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Cargar plantillas al abrir el modal
  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  // Función para cargar las plantillas
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const templatesData = await api.getTaskTemplates();
      setTemplates(templatesData);
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
      setError(err.message || 'Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  // Función para guardar una plantilla
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert(t('error'), t('enterTemplateName'));
      return;
    }

    // Validar que haya un título (campo obligatorio en el backend)
    if (!currentTask.title || !currentTask.title.trim()) {
      Alert.alert(t('error'), 'El título de la tarea es obligatorio');
      return;
    }

    setSavingTemplate(true);
    try {
      // Extraer solo los campos necesarios para la plantilla
      // Preparamos la ubicación correctamente para MongoDB
      let locationData = null;
      
      if (currentTask.location && 
         (Array.isArray(currentTask.location.coordinates) || 
          (currentTask.longitude !== undefined && currentTask.latitude !== undefined))) {
        locationData = {
          type: 'Point',
          coordinates: Array.isArray(currentTask.location.coordinates) 
            ? currentTask.location.coordinates 
            : [currentTask.longitude || 0, currentTask.latitude || 0]
        };
      }

      const templateData = {
        name: templateName,
        title: currentTask.title.trim(),
        description: currentTask.description || '',
        locationName: currentTask.locationName || '',
        location: locationData,
        radius: parseFloat(currentTask.radius) || 0.1,
        timeLimit: parseInt(currentTask.timeLimit) || 15,
        keywords: Array.isArray(currentTask.keywords) 
          ? currentTask.keywords 
          : (typeof currentTask.keywords === 'string' 
              ? currentTask.keywords.split(',').map(k => k.trim()) 
              : []),
        handsFreeMode: Boolean(currentTask.handsFreeMode)
      };
      
      console.log('Guardando plantilla con datos:', JSON.stringify(templateData, null, 2));

      await api.saveTaskTemplate(templateData);
      Alert.alert(t('success'), t('templateSaved'));
      setTemplateName('');
      setShowSaveForm(false);
      loadTemplates(); // Recargar la lista de plantillas
    } catch (err) {
      console.error('Error al guardar plantilla:', err);
      Alert.alert(t('error'), `${t('errorSavingTemplate')}: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Función para eliminar una plantilla
  const handleDeleteTemplate = async (templateId) => {
    try {
      await api.deleteTaskTemplate(templateId);
      Alert.alert(t('success'), t('templateDeleted'));
      loadTemplates(); // Recargar la lista de plantillas
    } catch (err) {
      console.error('Error al eliminar plantilla:', err);
      Alert.alert(t('error'), t('errorDeletingTemplate'));
    }
  };

  // Renderizar un elemento de la lista de plantillas
  const renderTemplateItem = ({ item }) => (
    <View style={styles.templateItem}>
      <TouchableOpacity 
        style={styles.templateContent}
        onPress={() => onSelectTemplate(item)}
      >
        <Ionicons name="document-text-outline" size={24} color="#fff3e5" style={styles.templateIcon} />
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{item.name}</Text>
          <Text style={styles.templateTitle}>{item.title}</Text>
          {item.locationName && (
            <Text style={styles.templateLocation}>
              <Ionicons name="location-outline" size={12} color="rgba(255, 243, 229, 0.7)" /> {item.locationName}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            t('deleteTemplate'),
            `¿Estás seguro que deseas eliminar la plantilla "${item.name}"?`,
            [
              { text: t('cancel'), style: 'cancel' },
              { text: t('delete'), style: 'destructive', onPress: () => handleDeleteTemplate(item._id) }
            ]
          );
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#ff5252" />
      </TouchableOpacity>
    </View>
  );

  // Renderizar el formulario para guardar una nueva plantilla
  const renderSaveForm = () => {
    // Verificar si la tarea tiene un título (requisito para guardar)
    const hasTitle = currentTask.title && currentTask.title.trim().length > 0;
    const canSave = templateName.trim().length > 0 && hasTitle;
    
    return (
      <View style={styles.saveForm}>
        <Text style={styles.saveFormTitle}>{t('saveAsTemplate')}</Text>
        <TextInput 
          style={styles.input}
          placeholder={t('templateName')}
          placeholderTextColor="rgba(255, 243, 229, 0.5)"
          value={templateName}
          onChangeText={setTemplateName}
        />
        
        {!hasTitle && (
          <Text style={styles.validationErrorText}>Para guardar como plantilla, la tarea debe tener un título.</Text>
        )}
        
        <View style={styles.saveFormActions}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowSaveForm(false)}
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, (!canSave || savingTemplate) && styles.disabledButton]}
            onPress={handleSaveTemplate}
            disabled={!canSave || savingTemplate}
          >
            {savingTemplate ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('taskTemplates')}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff3e5" />
            </TouchableOpacity>
          </View>

          {showSaveForm ? (
            renderSaveForm()
          ) : (
            <>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fff3e5" />
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={loadTemplates}>
                    <Text style={styles.retryButtonText}>{t('retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : templates.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={48} color="rgba(255, 243, 229, 0.5)" />
                  <Text style={styles.emptyText}>{t('noTemplates')}</Text>
                </View>
              ) : (
                <FlatList
                  data={templates}
                  renderItem={renderTemplateItem}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.templatesList}
                />
              )}

              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setShowSaveForm(true)}
                >
                  <Ionicons name="save-outline" size={20} color="#fff3e5" style={styles.actionIcon} />
                  <Text style={styles.actionText}>{t('saveAsTemplate')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff5252',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 243, 229, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff3e5',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255, 243, 229, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  templatesList: {
    padding: 10,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  templateContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  templateIcon: {
    marginRight: 10,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 2,
  },
  templateTitle: {
    fontSize: 14,
    color: 'rgba(255, 243, 229, 0.7)',
    marginBottom: 2,
  },
  templateLocation: {
    fontSize: 12,
    color: 'rgba(255, 243, 229, 0.5)',
  },
  deleteButton: {
    padding: 15,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 243, 229, 0.1)',
  },
  actionsContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 243, 229, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#fff3e5',
    fontWeight: 'bold',
  },
  saveForm: {
    padding: 15,
  },
  saveFormTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff3e5',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  saveFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  cancelButtonText: {
    color: '#ff5252',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#fff3e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  validationErrorText: {
    color: '#ff5252',
    marginBottom: 15,
    fontSize: 14,
  },
});

export default TaskTemplateSelector;
