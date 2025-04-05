import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  Vibration,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useLanguage } from '../context/LanguageContext';

const VERIFICATION_INTERVAL = 10000; // 10 segundos en milisegundos
const VIBRATION_PATTERN = Platform.OS === 'android' ? [1000, 1000] : [1000, 2000, 1000, 2000]; // Patrón de vibración (vibrar, pausa)
const SPEECH_DELAY = 1000; // Retraso antes de leer el código en voz alta (ms)
const LISTENING_DELAY = 0; // Retraso antes de activar el micrófono (ms)
const LISTENING_TIMEOUT = 10000; // Tiempo máximo de escucha (ms)

const VerificationPrompt = ({ 
  onVerify, 
  onFailed,
  verificationText,
  verificationButtonText,
  style, 
  textStyle
}) => {
  const { strings, language } = useLanguage();
  
  // Debug logs
  console.log("VerificationPrompt - Current language:", language);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Function to show the modal and generate a new code
  const showVerificationModal = () => {
    setModalVisible(true);
    const newCode = generateRandomCode();
    setGeneratedCode(newCode);
    setEnteredCode('');
  };
  
  // Function to generate a random 4-digit code
  const generateRandomCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };
  
  // Function to verify the entered code
  const handleVerify = () => {
    setProcessing(true);
    if (enteredCode === generatedCode) {
      setTimeout(() => {
        setModalVisible(false);
        setProcessing(false);
        if (onVerify) onVerify();
      }, 500);
    } else {
        setTimeout(() => {
        setProcessing(false);
        setEnteredCode('');
        // Show some error feedback
        }, 500);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
          setModalVisible(false);
    if (onFailed) onFailed();
  };
  
  return (
    <View>
      {/* Main Button */}
      <TouchableOpacity
        style={[styles.actionButton, style]}
        onPress={showVerificationModal}
      >
        <Text style={[styles.actionButtonText, textStyle]}>
          {verificationButtonText || strings?.verify || 'Verify'}
        </Text>
      </TouchableOpacity>
      
      {/* Verification Modal */}
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {strings?.verificationRequired || 'Verification Required'}
            </Text>
            
            <Text style={styles.modalDescription}>
              {verificationText || strings?.enterVerificationCode || 'Please enter the verification code to proceed:'}
          </Text>
          
            <Text style={styles.codeDisplay}>{generatedCode}</Text>
            
            <TextInput
              style={styles.codeInput}
              placeholder={strings?.enterCode || "Enter code"}
              keyboardType="numeric"
              maxLength={4}
              value={enteredCode}
              onChangeText={setEnteredCode}
              editable={!processing}
            />
          
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={processing}
              >
                <Text style={styles.buttonText}>
                  {strings?.cancel || 'Cancel'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.verifyButton, enteredCode.length < 4 && styles.disabledButton]}
                onPress={handleVerify}
                disabled={enteredCode.length < 4 || processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>
                    {strings?.verify || 'Verify'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#555',
  },
  codeDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#4A90E2',
    letterSpacing: 2,
  },
  codeInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#DDD',
  },
  verifyButton: {
    backgroundColor: '#4A90E2',
  },
  disabledButton: {
    backgroundColor: '#AAA',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VerificationPrompt;
