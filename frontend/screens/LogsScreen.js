import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { app, firebaseAuth } from '../firebase';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const db = getFirestore(app);

export default function LogsScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, 'users', currentUser.uid, 'logs'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
    });

    return unsubscribe;
  }, []);

  const renderEmployee = (emp, idx) => (
    <View key={`${emp.name}-${idx}`} style={styles.employeeRow}>
      <Text style={styles.employeeName}>{emp.name}</Text>
      <Text style={styles.employeeHours}>{emp.hours} hrs</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logTitle}>Job: {item.jobNumber} - {item.date}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foreman: {item.foreman} ({item.foremanHours} hrs)</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employees</Text>
        {Array.isArray(item.employees) && item.employees.length > 0 ? (
          item.employees.map(renderEmployee)
        ) : (
          <Text style={styles.emptyText}>No employees listed</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Description</Text>
        <Text style={styles.taskText}>{item.taskDescription}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../assets/langford-logo.jpg')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Logs</Text>
            <Text style={styles.headerSubtitle}>Langford Mechanical</Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.navButtonText}>Log Entry</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.listContainer}
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No logs yet. Submit your first log.</Text>
          </View>
        }
      />
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
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  logCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logHeader: {
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logSubTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  employeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  employeeName: {
    fontSize: 14,
    color: '#2c3e50',
  },
  employeeHours: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  taskText: {
    fontSize: 14,
    color: '#2c3e50',
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
});


