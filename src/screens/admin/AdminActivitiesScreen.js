import React from 'react';
import { 
  SafeAreaView, 
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import AdminActivityList from '../../components/AdminActivityList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../../services/api';

const { width, height } = Dimensions.get('window');

const AdminActivitiesScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);

  const downloadExcelReport = async () => {
    try {
      setIsGeneratingExcel(true);
      
      // Obtener el token directamente de AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }
      
      // URL del endpoint del reporte con parámetros adicionales para formatear correctamente
      const reportUrl = `${api.getApiUrl()}/api/reports/activities/excel`;
      
      // Añadir parámetros para mejorar el formato del reporte
      // formatVoiceNotes=true: cambia "voice_note" a "bitacora" e incluye el texto en la descripción
      // groupByTask=true: agrupa las actividades por tarea además de por usuario
      const fullUrl = `${reportUrl}?token=${encodeURIComponent(token)}&formatVoiceNotes=true&groupByTask=true`;
      console.log('Abriendo URL de reporte con formato mejorado:', fullUrl);
      
      // Intentar abrir la URL
      const canOpen = await Linking.canOpenURL(fullUrl);
      if (!canOpen) {
        throw new Error('No se puede abrir la URL del reporte');
      }
      
      await Linking.openURL(fullUrl);
      
      setTimeout(() => {
        setIsGeneratingExcel(false);
      }, 2000);
    } catch (error) {
      console.error('Error al descargar el reporte:', error);
      Alert.alert(
        t('error'), 
        error.message || t('errorDownloadingReport') || 'Error al descargar el reporte',
        [{ text: 'OK', onPress: () => setIsGeneratingExcel(false) }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.colors.darkGrey} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.lightCream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('viewAllActivities')}</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.excelButton}
            onPress={downloadExcelReport}
            disabled={isGeneratingExcel}
          >
            <Ionicons name="calculator-outline" size={20} color={theme.colors.white} />
            {isGeneratingExcel && <ActivityIndicator size="small" color={theme.colors.white} style={{marginLeft: 5}} />}
          </TouchableOpacity>
        </View>
      </View>
      
      <AdminActivityList />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 20 : 40, // Extra padding for status bar
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: Math.min(width * 0.05, 18),
    fontWeight: 'bold',
    color: '#fff3e5',
    flex: 1,
  },
  excelButton: {
    backgroundColor: '#1c1c1c',
    padding: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  buttonGroup: {
    flexDirection: 'row',
  },
});

export default AdminActivitiesScreen;
