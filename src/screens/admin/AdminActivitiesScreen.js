import React from 'react';
import { 
  SafeAreaView, 
  StyleSheet,
  View,
  TouchableOpacity,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import AdminActivityList from '../../components/AdminActivityList';

const AdminActivitiesScreen = ({ navigation }) => {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('viewAllActivities')}</Text>
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
    backgroundColor: '#4A90E2',
    padding: 15,
    paddingTop: 40, // Extra padding for status bar
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default AdminActivitiesScreen;
