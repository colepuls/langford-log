import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  Image,
  Pressable,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { app, firebaseAuth } from '../firebase';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
} from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { onSnapshot } from 'firebase/firestore';

const db = getFirestore(app);

export default function LogEntryScreen({ route }) {
  const { userEmail } = route.params;
  const navigation = useNavigation();

  const [foremen, setForemen] = useState([]);
  const [employeesMap, setEmployeesMap] = useState({});

  const [foremanName, setForemanName] = useState('');
  const [foremanHours, setForemanHours] = useState('');
  const [date, setDate] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeHours, setEmployeeHours] = useState({});
  const [taskDescription, setTaskDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickerValue, setPickerValue] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Modal state for dropdowns
  const [foremanDropdownVisible, setForemanDropdownVisible] = useState(false);
  const [employeeDropdownVisible, setEmployeeDropdownVisible] = useState(false);

  useEffect(() => {
    const unsubForemen = onSnapshot(collection(db, 'foremen'), (snapshot) => {
      const foremenList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('Updated foremen:', foremenList);
      setForemen(foremenList);
    });
  
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const empMap = {};
      snapshot.forEach(doc => {
        empMap[doc.id.trim()] = doc.data().list.map(e => e.trim());
      });
      console.log('Updated employeesMap:', empMap);
      setEmployeesMap(empMap);
    });
  
    return () => {
      unsubForemen();
      unsubEmployees();
    };
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => { setSettingsVisible(false); await signOut(firebaseAuth); } }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (firebaseAuth.currentUser) {
                await deleteUser(firebaseAuth.currentUser);
                setSettingsVisible(false);
              }
            } catch (err) {
              if (err && err.code === 'auth/requires-recent-login') {
                Alert.alert('Re-authentication Required', 'Please log out and sign in again, then try deleting your account.');
              } else {
                Alert.alert('Error', 'Failed to delete account. Please try again.');
              }
            }
          }
        }
      ]
    );
  };

  const selectedForeman = foremen.find(f => f.name === foremanName);
  const employeeOptions = selectedForeman
    ? employeesMap[selectedForeman.category] || []
    : [];

  const handleAddEmployee = () => {
    if (
      pickerValue &&
      !selectedEmployees.includes(pickerValue) &&
      selectedEmployees.length < 20
    ) {
      setSelectedEmployees([...selectedEmployees, pickerValue]);
      setEmployeeHours({ ...employeeHours, [pickerValue]: '' });
      setPickerValue('');
    }
  };

  const handleRemoveEmployee = (employee) => {
    setSelectedEmployees(selectedEmployees.filter((e) => e !== employee));
    const updated = { ...employeeHours };
    delete updated[employee];
    setEmployeeHours(updated);
  };

  const updateHours = (employee, hours) => {
    setEmployeeHours({ ...employeeHours, [employee]: hours });
  };

  const handleSelectPhotos = async () => {
    if (photos.length >= 20) {
      Alert.alert('Photo Limit', 'Maximum 20 photos allowed.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Permission required to access photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 20 - photos.length,
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotos([...photos, ...result.assets]);
    }
  };

  const handleTakePhoto = async () => {
    if (photos.length >= 20) {
      Alert.alert('Photo Limit', 'Maximum 20 photos allowed.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Permission required to use camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0]]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!foremanName || !foremanHours || !date || !jobNumber || !taskDescription) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // Check if all employees have hours
    const missingHours = selectedEmployees.filter(emp => !employeeHours[emp] || employeeHours[emp].trim() === '');
    if (missingHours.length > 0) {
      Alert.alert('Missing Hours', `Please enter hours for: ${missingHours.join(', ')}`);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    const employees = selectedEmployees.map((name) => ({
      name,
      hours: employeeHours[name] || '',
    }));

    formData.append('foreman', foremanName);
    formData.append('foremanHours', foremanHours);
    formData.append('date', date);
    formData.append('jobNumber', jobNumber);
    formData.append('employees', JSON.stringify(employees));
    formData.append('taskDescription', taskDescription);
    formData.append('userEmail', userEmail);

    photos.forEach((photo, index) => {
      formData.append('photos', {
        uri: photo.uri,
        name: `photo_${index + 1}.jpg`,
        type: 'image/jpeg',
      });
    });

    try {
      const response = await fetch(
        'https://langford-log-app.onrender.com/submit-log',
        { method: 'POST', body: formData },
      );

      const result = await response.json();
      console.log('API response:', result);
      // Save to Firestore for this user
      if (firebaseAuth.currentUser) {
        const userLogsCol = collection(db, 'users', firebaseAuth.currentUser.uid, 'logs');
        await addDoc(userLogsCol, {
          userEmail,
          foreman: foremanName,
          foremanHours,
          date,
          jobNumber,
          employees,
          taskDescription,
          createdAt: serverTimestamp(),
        });
      }
      
      Alert.alert('Success', 'Log submitted successfully!', [
        { text: 'OK', onPress: () => {
          // Reset form
          setForemanName('');
          setForemanHours('');
          setDate('');
          setJobNumber('');
          setSelectedEmployees([]);
          setEmployeeHours({});
          setTaskDescription('');
          setPhotos([]);
          setPickerValue('');
        }}
      ]);
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Failed to submit log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderDropdownItem = (item, onSelect, currentValue, isEmployee = false, key) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.dropdownItem,
        currentValue === item && styles.dropdownItemSelected
      ]}
      onPress={() => {
        onSelect(item);
        if (isEmployee) {
          setEmployeeDropdownVisible(false);
        } else {
          setForemanDropdownVisible(false);
        }
      }}
    >
      <Text style={[
        styles.dropdownItemText,
        currentValue === item && styles.dropdownItemTextSelected
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../assets/langford-logo.jpg')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Log Entry</Text>
            <Text style={styles.headerSubtitle}>Langford Mechanical</Text>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.logsButton}
            onPress={() => navigation.navigate('Logs')}
          >
            <Text style={styles.logsButtonText}>Logs</Text>
          </TouchableOpacity>
          {userEmail.toLowerCase() === ('brian@langfordmechanical.com' || 'colepuls@me.com') && (
            <TouchableOpacity 
              style={styles.adminButton}
              onPress={() => navigation.navigate('Admin')}
            >
              <Text style={styles.adminButtonText}>Admin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
              {/* Form Sections */}
              <View style={styles.formSection}>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Foreman</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setForemanDropdownVisible(true)}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {foremanName || 'Select Foreman'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Hours</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Hours"
                      value={foremanHours}
                      onChangeText={setForemanHours}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={styles.label}>Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MM/DD/YYYY"
                      value={date}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/\D/g, '');
                        let formatted = cleaned;
                        if (cleaned.length >= 3 && cleaned.length <= 4) {
                          formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
                        } else if (cleaned.length > 4) {
                          formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
                        }
                        setDate(formatted);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Job</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter job name or number"
                    value={jobNumber}
                    onChangeText={setJobNumber}
                  />
                </View>
              </View>

              {/* Employee Section */}
              <View style={styles.formSection}>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Employee</Text>
                  <View style={styles.employeeAddRow}>
                    <TouchableOpacity
                      style={[styles.dropdownButton, { flex: 1, marginRight: 10 }]}
                      onPress={() => setEmployeeDropdownVisible(true)}
                      disabled={!selectedForeman}
                    >
                      <Text style={[
                        styles.dropdownButtonText,
                        !selectedForeman && styles.dropdownButtonTextDisabled
                      ]}>
                        {pickerValue || 'Select Employee'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.addButton, !selectedForeman && styles.addButtonDisabled]}
                      onPress={handleAddEmployee} 
                      disabled={!selectedForeman}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedEmployees.map((emp, idx) => (
                  <View key={idx} style={styles.employeeRow}>
                    <Text style={styles.employeeName}>{emp}</Text>
                    <TextInput
                      style={[styles.input, styles.hoursInput]}
                      placeholder="Hours"
                      keyboardType="numeric"
                      value={employeeHours[emp]}
                      onChangeText={(text) => updateHours(emp, text)}
                    />
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => handleRemoveEmployee(emp)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Task Description */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Job Description</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}></Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe job..."
                    multiline
                    textAlignVertical="top"
                    value={taskDescription}
                    onChangeText={setTaskDescription}
                  />
                </View>
              </View>

              {/* Photos Section */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Add Photos (Optional)</Text>
                  <View style={styles.photoButtons}>
                    <TouchableOpacity style={styles.photoButton} onPress={handleSelectPhotos}>
                      <Text style={styles.photoButtonText}>Select Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {photos.length > 0 && (
                    <View style={styles.previewContainer}>
                      {photos.map((photo, index) => (
                        <View key={index} style={styles.previewWrapper}>
                          <Image
                            source={{ uri: photo.uri }}
                            style={styles.previewImage}
                          />
                          <TouchableOpacity 
                            style={styles.removePhotoButton}
                            onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                          >
                            <Text style={styles.removePhotoButtonText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <Text style={styles.photoHint}>
                    {photos.length}/20 photos selected
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <View style={styles.submitSection}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Submitting log...</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>Submit Daily Log</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

      {/* Foreman Dropdown Modal */}
      <Modal
        visible={foremanDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setForemanDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setForemanDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <ScrollView style={styles.dropdownScroll}>
              {foremen.map((foreman) => 
                renderDropdownItem(foreman.name, setForemanName, foremanName, false, foreman.id)
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Employee Dropdown Modal */}
      <Modal
        visible={employeeDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmployeeDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setEmployeeDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <ScrollView style={styles.dropdownScroll}>
              {employeeOptions.map((employee, index) => 
                renderDropdownItem(employee, setPickerValue, pickerValue, true, `employee-${index}-${employee}`)
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setSettingsVisible(false)}
        >
          <View style={styles.dropdownModal}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50', textAlign: 'center' }}>Settings</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50', textAlign: 'center' }}>{userEmail}</Text>
            <TouchableOpacity style={[styles.settingsActionButton, { backgroundColor: '#e74c3c' }]} onPress={handleLogout}>
              <Text style={styles.settingsActionText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingsActionButton, { backgroundColor: '#c0392b' }]} onPress={handleDeleteAccount}>
              <Text style={styles.settingsActionText}>Delete Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingsActionButton, { backgroundColor: '#95a5a6' }]} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.settingsActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 6,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logsButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#7f8c8d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  settingsActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#34495e',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  employeeAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  employeeName: {
    flex: 2,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  hoursInput: {
    flex: 1,
    marginHorizontal: 10,
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  previewWrapper: {
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoHint: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submitSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownButtonTextDisabled: {
    color: '#95a5a6',
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownScroll: {
    maxHeight: 250,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  dropdownItemSelected: {
    backgroundColor: '#ecf0f1',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownItemTextSelected: {
    fontWeight: 'bold',
    color: '#3498db',
  },
});