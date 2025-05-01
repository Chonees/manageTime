import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { getApiUrl } from '../services/platform-config';

const ApiTestScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [customEndpoint, setCustomEndpoint] = useState('/api/locations/saved');
  const [customMethod, setCustomMethod] = useState('GET');
  const [customBody, setCustomBody] = useState('');
  
  // Test the root endpoint
  const testRootEndpoint = async () => {
    await testEndpoint('/', 'GET');
  };
  
  // Test the locations endpoint
  const testLocationsEndpoint = async () => {
    await testEndpoint('/api/locations', 'GET');
  };
  
  // Test the saved locations endpoint
  const testSavedLocationsEndpoint = async () => {
    await testEndpoint('/api/locations/saved', 'GET');
  };
  
  // Test a custom endpoint
  const testCustomEndpoint = async () => {
    await testEndpoint(customEndpoint, customMethod, customBody ? JSON.parse(customBody) : null);
  };
  
  // Generic function to test any endpoint
  const testEndpoint = async (endpoint, method, body = null) => {
    setLoading(true);
    setResults(null);
    setError(null);
    
    try {
      const baseUrl = getApiUrl();
      const url = `${baseUrl}${endpoint}`;
      console.log(`Testing endpoint: ${url} with method: ${method}`);
      
      // Get authentication token
      const token = await AsyncStorage.getItem('token');
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Using authentication token');
      } else {
        console.log('No authentication token found');
      }
      
      // Prepare request options
      const options = {
        method,
        headers
      };
      
      // Add body for POST, PUT methods
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      
      console.log('Request options:', JSON.stringify(options, null, 2));
      
      // Make the request
      const response = await fetch(url, options);
      console.log(`Response status: ${response.status}`);
      
      // Try to parse response as JSON
      let responseData;
      const responseText = await response.text();
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { text: responseText };
      }
      
      // Set results
      setResults({
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
        data: responseData
      });
      
      // Show success or error message
      if (response.ok) {
        Alert.alert(
          t('success'),
          `${t('endpointAccessible')}: ${response.status}`,
          [{ text: t('ok') }]
        );
      } else {
        Alert.alert(
          t('warning'),
          `${t('endpointError')}: ${response.status}`,
          [{ text: t('ok') }]
        );
      }
    } catch (error) {
      console.error('Error testing endpoint:', error);
      setError(error.message || 'Unknown error');
      
      Alert.alert(
        t('error'),
        `${t('errorTestingEndpoint')}: ${error.message}`,
        [{ text: t('ok') }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('apiTest')}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>{t('apiEndpointTests')}</Text>
        <Text style={styles.sectionDescription}>
          {t('apiTestDescription')}
        </Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={testRootEndpoint}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="home" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>{t('testRootEndpoint')}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#2E7D32', marginTop: 10 }]}
          onPress={testLocationsEndpoint}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="location" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>{t('testLocationsEndpoint')}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#1565C0', marginTop: 10 }]}
          onPress={testSavedLocationsEndpoint}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="bookmark" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>{t('testSavedLocationsEndpoint')}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>{t('customApiTest')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('endpoint')}</Text>
          <TextInput
            style={styles.input}
            value={customEndpoint}
            onChangeText={setCustomEndpoint}
            placeholder="/api/endpoint"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('method')}</Text>
          <View style={styles.methodButtons}>
            {['GET', 'POST', 'PUT', 'DELETE'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodButton,
                  customMethod === method && styles.methodButtonActive
                ]}
                onPress={() => setCustomMethod(method)}
              >
                <Text 
                  style={[
                    styles.methodButtonText,
                    customMethod === method && styles.methodButtonTextActive
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {(customMethod === 'POST' || customMethod === 'PUT') && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('requestBody')} (JSON)</Text>
            <TextInput
              style={[styles.input, styles.bodyInput]}
              value={customBody}
              onChangeText={setCustomBody}
              placeholder='{"key": "value"}'
              multiline
              numberOfLines={4}
            />
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#FF5722', marginTop: 10 }]}
          onPress={testCustomEndpoint}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="code-working" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>{t('testCustomEndpoint')}</Text>
            </>
          )}
        </TouchableOpacity>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('error')}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}
        
        {results && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              {t('testResults')}
            </Text>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>URL:</Text>
              <Text style={styles.resultValue}>{results.url}</Text>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>{t('method')}:</Text>
              <Text style={styles.resultValue}>{results.method}</Text>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>{t('status')}:</Text>
              <Text 
                style={[
                  styles.resultValue,
                  results.status >= 200 && results.status < 300 ? styles.successText : styles.errorText
                ]}
              >
                {results.status} {results.statusText}
              </Text>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>{t('responseData')}:</Text>
              <Text style={styles.resultValue}>
                {JSON.stringify(results.data, null, 2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8'
  },
  backButton: {
    padding: 5
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  headerRight: {
    width: 34
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 15
  },
  buttonIcon: {
    marginRight: 10
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e4e8',
    marginVertical: 20
  },
  inputGroup: {
    marginBottom: 15
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16
  },
  bodyInput: {
    height: 100,
    textAlignVertical: 'top'
  },
  methodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 2
  },
  methodButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2'
  },
  methodButtonText: {
    color: '#333',
    fontWeight: 'bold'
  },
  methodButtonTextActive: {
    color: '#fff'
  },
  errorContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f'
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 5
  },
  errorMessage: {
    fontSize: 14,
    color: '#333'
  },
  resultsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e1e4e8'
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  resultItem: {
    marginBottom: 10
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  resultValue: {
    fontSize: 13,
    color: '#666',
    marginTop: 3
  },
  successText: {
    color: '#2E7D32'
  },
  errorText: {
    color: '#D32F2F'
  }
});

export default ApiTestScreen;
