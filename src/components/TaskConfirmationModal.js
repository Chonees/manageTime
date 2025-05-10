import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const TaskConfirmationModal = ({ 
  visible, 
  task, 
  onReject, 
  onAcceptWithoutStart, 
  onClose,
  isLoading
}) => {
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('confirmTask') || 'Confirmar Tarea'}</Text>
          
          <View style={styles.taskInfoContainer}>
            <Text style={styles.taskTitle}>{task?.title || ''}</Text>
            
            <View style={styles.timeContainer}>
              {task?.timeLimit > 0 && (
                <>
                  <Ionicons name="timer-outline" size={20} color="#FF9500" />
                  <Text style={styles.timeText}>
                    {t('timeLimit') || 'Tiempo límite'}: {task.timeLimit} {t('minutes') || 'minutos'}
                  </Text>
                </>
              )}
            </View>
            
            <Text style={styles.taskDescription}>
              {task?.description || t('noDescription') || 'Sin descripción'}
            </Text>
          </View>
          
          <Text style={styles.confirmationText}>
            {t('taskConfirmationQuestion') || '¿Deseas aceptar esta tarea?'}
          </Text>
          
          <View style={styles.buttonContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#fff3e5" />
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.button, styles.rejectButton]}
                  onPress={onReject}
                >
                  <Text style={styles.rejectButtonText}>{t('reject') || 'Rechazar'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.acceptButton]}
                  onPress={onAcceptWithoutStart}
                >
                  <Text style={styles.acceptButtonText}>{t('acceptOnly') || 'Aceptar'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)'
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#2e2e2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 15,
    textAlign: 'center'
  },
  taskInfoContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  timeText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6
  },
  taskDescription: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20
  },
  confirmationText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    minWidth: '30%',
    alignItems: 'center'
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff7675'
  },
  acceptButton: {
    backgroundColor: '#fff3e5'
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ff7675'
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2e2e2e'
  }
});

export default TaskConfirmationModal;
