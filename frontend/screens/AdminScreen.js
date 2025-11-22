import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getFirestore,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import { firebaseAuth, app } from '../firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

const db = getFirestore(app);

export default function AdminScreen() {
  const navigation = useNavigation();

  const [foremen, setForemen] = useState([]);
  const [employeesMap, setEmployeesMap] = useState({});

  const [newForeman, setNewForeman] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [newEmployee, setNewEmployee] = useState('');

  // Edit state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState(''); // 'foreman' or 'employee'
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Dropdown state
  const [foremanCategoryDropdownVisible, setForemanCategoryDropdownVisible] = useState(false);
  const [employeeCategoryDropdownVisible, setEmployeeCategoryDropdownVisible] = useState(false);
  const [editCategoryDropdownVisible, setEditCategoryDropdownVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Get unique categories from existing data
  const getUniqueCategories = () => {
    const categories = new Set();
    
    // Add categories from foremen
    foremen.forEach(foreman => {
      if (foreman.category) {
        categories.add(foreman.category);
      }
    });
    
    // Add categories from employees
    Object.keys(employeesMap).forEach(category => {
      if (category) {
        categories.add(category);
      }
    });
    
    return Array.from(categories).sort();
  };

  const uniqueCategories = getUniqueCategories();

  useEffect(() => {
    const unsubForemen = onSnapshot(collection(db, 'foremen'), (snapshot) => {
      const loadedForemen = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setForemen(loadedForemen);
    });

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const empMap = {};
      snapshot.forEach(doc => {
        empMap[doc.id.trim()] = doc.data().list || [];
      });
      setEmployeesMap(empMap);
    });

    return () => {
      unsubForemen();
      unsubEmployees();
    };
  }, []);

  const addForeman = async () => {
    const name = newForeman.trim();
    const category = newCategory.trim();

    if (!name || !category) {
      Alert.alert('Error', 'Enter name and select category.');
      return;
    }

    await setDoc(doc(db, 'foremen', name), {
      name,
      category,
    });

    setNewForeman('');
    setNewCategory('');
  };

  const removeForeman = async (foremanName) => {
    try {
      await deleteDoc(doc(db, 'foremen', foremanName));
      Alert.alert('Success', 'Foreman removed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove foreman: ' + error.message);
    }
  };

  const editForeman = (foreman) => {
    setEditingItem(foreman);
    setEditType('foreman');
    setEditName(foreman.name);
    setEditCategory(foreman.category);
    setEditModalVisible(true);
  };

  const saveForemanEdit = async () => {
    try {
      const newName = editName.trim();
      const newCategory = editCategory.trim();

      if (!newName || !newCategory) {
        Alert.alert('Error', 'Name and category are required.');
        return;
      }

      // If name changed, we need to delete old doc and create new one
      if (newName !== editingItem.name) {
        await deleteDoc(doc(db, 'foremen', editingItem.name));
        await setDoc(doc(db, 'foremen', newName), {
          name: newName,
          category: newCategory,
        });
      } else {
        // Just update the category
        await updateDoc(doc(db, 'foremen', newName), {
          category: newCategory,
        });
      }

      setEditModalVisible(false);
      setEditingItem(null);
      setEditName('');
      setEditCategory('');
      Alert.alert('Success', 'Foreman updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update foreman: ' + error.message);
    }
  };

  const addEmployee = async () => {
    const category = selectedCategory.trim();
    const employee = newEmployee.trim();

    if (!category || !employee) {
      Alert.alert('Error', 'Select category and enter employee name.');
      return;
    }

    const docRef = doc(db, 'employees', category);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        list: arrayUnion(employee),
      });
    } else {
      await setDoc(docRef, {
        list: [employee],
      });
    }

    setNewEmployee('');
  };

  const removeEmployee = async (category, name) => {
    try {
      const currentList = employeesMap[category] || [];
      const updatedList = currentList.filter(e => e !== name);

      if (updatedList.length === 0) {
        await deleteDoc(doc(db, 'employees', category));
      } else {
        await updateDoc(doc(db, 'employees', category), {
          list: updatedList,
        });
      }
      Alert.alert('Success', 'Employee removed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove employee: ' + error.message);
    }
  };

  const editEmployee = (category, name) => {
    setEditingItem({ category, name });
    setEditType('employee');
    setEditName(name);
    setEditCategory(category);
    setEditModalVisible(true);
  };

  const saveEmployeeEdit = async () => {
    try {
      const newName = editName.trim();
      const newCategory = editCategory.trim();

      if (!newName || !newCategory) {
        Alert.alert('Error', 'Name and category are required.');
        return;
      }

      const oldCategory = editingItem.category;
      const oldName = editingItem.name;

      // Remove from old category
      const oldList = employeesMap[oldCategory] || [];
      const updatedOldList = oldList.filter(e => e !== oldName);

      if (updatedOldList.length === 0) {
        await deleteDoc(doc(db, 'employees', oldCategory));
      } else {
        await updateDoc(doc(db, 'employees', oldCategory), {
          list: updatedOldList,
        });
      }

      // Add to new category
      const newDocRef = doc(db, 'employees', newCategory);
      const newDocSnap = await getDoc(newDocRef);

      if (newDocSnap.exists()) {
        await updateDoc(newDocRef, {
          list: arrayUnion(newName),
        });
      } else {
        await setDoc(newDocRef, {
          list: [newName],
        });
      }

      setEditModalVisible(false);
      setEditingItem(null);
      setEditName('');
      setEditCategory('');
      Alert.alert('Success', 'Employee updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update employee: ' + error.message);
    }
  };

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

  const goBackToLogEntry = () => {
    navigation.goBack();
  };

  const renderDropdownItem = (category, onSelect, currentValue, key) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.dropdownItem,
        currentValue === category && styles.dropdownItemSelected
      ]}
      onPress={() => {
        onSelect(category);
        setForemanCategoryDropdownVisible(false);
        setEmployeeCategoryDropdownVisible(false);
        setEditCategoryDropdownVisible(false);
      }}
    >
      <Text style={[
        styles.dropdownItemText,
        currentValue === category && styles.dropdownItemTextSelected
      ]}>
        {category}
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
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>Langford Mechanical</Text>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={goBackToLogEntry}
          >
            <Text style={styles.navButtonText}>Log Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.flatListContainer}
        ListHeaderComponent={
          <>
            {/* Add Foreman Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Add New Foreman</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Foreman Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter foreman name"
                  value={newForeman}
                  onChangeText={setNewForeman}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setForemanCategoryDropdownVisible(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {newCategory || 'Select Category'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addForeman}
              >
                <Text style={styles.addButtonText}>Add Foreman</Text>
              </TouchableOpacity>
            </View>

            {/* Foremen List Section */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Current Foremen</Text>
              {foremen.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No foremen added yet</Text>
                </View>
              ) : (
                foremen.map((item) => (
                  <View key={item.id} style={styles.listItem}>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCategory}>({item.category})</Text>
                    </View>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => editForeman(item)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeForeman(item.name)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Add Employee Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Add New Employee</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Employee Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter employee name"
                  value={newEmployee}
                  onChangeText={setNewEmployee}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setEmployeeCategoryDropdownVisible(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {selectedCategory || 'Select Category'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addEmployee}
              >
                <Text style={styles.addButtonText}>Add Employee</Text>
              </TouchableOpacity>
            </View>

            {/* Employees List Section */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Current Employees</Text>
              {Object.keys(employeesMap).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No employees added yet</Text>
                </View>
              ) : (
                Object.entries(employeesMap).map(([category, list]) => (
                  <View key={category} style={styles.categoryBlock}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    {list.map((name, idx) => (
                      <View key={`${category}-${name}-${idx}`} style={styles.listItem}>
                        <View style={styles.itemContent}>
                          <Text style={styles.itemName}>{name}</Text>
                        </View>
                        <View style={styles.buttonContainer}>
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => editEmployee(category, name)}
                          >
                            <Text style={styles.editButtonText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.removeButton}
                            onPress={() => removeEmployee(category, name)}
                          >
                            <Text style={styles.removeButtonText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          </>
        }
        data={[]}
        renderItem={() => null}
      />

      {/* Category Dropdown Modal for Foreman */}
      <Modal
        visible={foremanCategoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setForemanCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setForemanCategoryDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <ScrollView style={styles.dropdownScroll}>
              {uniqueCategories.map((category, index) => 
                renderDropdownItem(category, setNewCategory, newCategory, `foreman-${index}-${category}`)
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Dropdown Modal for Employee */}
      <Modal
        visible={employeeCategoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmployeeCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setEmployeeCategoryDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <ScrollView style={styles.dropdownScroll}>
              {uniqueCategories.map((category, index) => 
                renderDropdownItem(category, setSelectedCategory, selectedCategory, `employee-${index}-${category}`)
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editType === 'foreman' ? 'Foreman' : 'Employee'}
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={editName}
                onChangeText={setEditName}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setEditCategoryDropdownVisible(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {editCategory || 'Select Category'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={editType === 'foreman' ? saveForemanEdit : saveEmployeeEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Dropdown Modal for Edit */}
      <Modal
        visible={editCategoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setEditCategoryDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <ScrollView style={styles.dropdownScroll}>
              {uniqueCategories.map((category, index) => 
                renderDropdownItem(category, setEditCategory, editCategory, `edit-${index}-${category}`)
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
  navButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  navButtonText: {
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
  flatListContainer: { 
    padding: 20,
    paddingBottom: 100,
  },
  formSection: { 
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
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
  addButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listSection: { 
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontStyle: 'italic',
    fontSize: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  itemCategory: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  categoryBlock: { 
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  categoryTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 10,
    color: '#2c3e50',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 12,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    gap: 15,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
