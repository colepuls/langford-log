import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert, 
  Image, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '../firebase';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSignup = async () => {
    // Input validation
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters long and contain uppercase, lowercase, and number.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
  
    try {
      await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
      navigation.replace('LogEntry', { userEmail: email.trim().toLowerCase() });
    } catch (err) {
      let errorMessage = 'Signup failed. Please try again.';
      
      // Provide more specific error messages
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/langford-logo.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.companyName}>Langford Mechanical</Text>
          <Text style={styles.subtitle}>Daily Log System</Text>
        </View>

        {/* Signup Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Create Account</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Email Address" 
            onChangeText={setEmail} 
            value={email} 
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            autoCorrect={false}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            onChangeText={setPassword} 
            value={password} 
            secureTextEntry 
            autoComplete="new-password"
            autoCorrect={false}
          />

          <TextInput 
            style={styles.input} 
            placeholder="Confirm Password" 
            onChangeText={setConfirmPassword} 
            value={confirmPassword} 
            secureTextEntry 
            autoComplete="new-password"
            autoCorrect={false}
          />
          
          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.signupButtonDisabled]} 
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.passwordHint}>
            Password must be at least 8 characters with uppercase, lowercase, and number
          </Text>
        </View>

        {/* Login Link */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 25, 
    textAlign: 'center',
    color: '#2c3e50'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e1e8ed', 
    padding: 15, 
    marginBottom: 15, 
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50'
  },
  signupButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passwordHint: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  link: { 
    color: '#3498db', 
    fontSize: 14,
    fontWeight: '600'
  }
});
