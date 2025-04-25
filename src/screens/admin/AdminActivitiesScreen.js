import React from 'react';
import { 
  SafeAreaView, 
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import AdminActivityList from '../../components/AdminActivityList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../../services/api';

const AdminActivitiesScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);

  const downloadExcelReport = async () => {
    try {
      setIsGeneratingExcel(true);
      
      // Obtener el token directamente de AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }
      
      // URL del endpoint del reporte
      const reportUrl = `${api.getApiUrl()}/api/reports/activities/excel`;
      
      // Abrir URL con el token incluido como parámetro de consulta y encabezado de autorización
      const fullUrl = `${reportUrl}?token=${encodeURIComponent(token)}`;
      console.log('Abriendo URL:', fullUrl);
      
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff3e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('viewAllActivities')}</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.excelButton}
            onPress={downloadExcelReport}
            disabled={isGeneratingExcel}
          >
            <Ionicons name="calculator-outline" size={18} color="#fff3e5" />
            {isGeneratingExcel && <ActivityIndicator size="small" color="#fff3e5" style={{marginLeft: 5}} />}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    padding: 15,
    paddingTop: 40, // Extra padding for status bar
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
    flex: 1,
  },
  excelButton: {
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
  },
});

export default AdminActivitiesScreen;
