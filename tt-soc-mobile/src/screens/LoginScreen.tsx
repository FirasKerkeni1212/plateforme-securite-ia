import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../api/axiosConfig';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
    loadSavedUsername();
  }, []);

  const loadSavedUsername = async () => {
    try {
      const saved = await SecureStore.getItemAsync('saved_username');
      if (saved) { setUsername(saved); setRememberMe(true); }
    } catch (err) { console.log('No saved username'); }
  };

  const validate = (): boolean => {
    let valid = true;
    const newErrors = { username: '', password: '' };
    if (!username.trim()) { newErrors.username = "Le nom d'utilisateur est requis"; valid = false; }
    else if (username.length < 3) { newErrors.username = 'Minimum 3 caractères'; valid = false; }
    if (!password) { newErrors.password = 'Le mot de passe est requis'; valid = false; }
    else if (password.length < 4) { newErrors.password = 'Minimum 4 caractères'; valid = false; }
    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/login', { username, password });
      const token = res.data.token || res.data.access_token;
      if (!token) throw new Error('Token non reçu');
      await SecureStore.setItemAsync('jwt_token', token);
      if (rememberMe) { await SecureStore.setItemAsync('saved_username', username); }
      else { await SecureStore.deleteItemAsync('saved_username'); }
      navigation.replace('Dashboard');
    } catch (err: any) {
      Alert.alert('Echec de connexion', err.response?.data?.error || 'Impossible de contacter le serveur SOC');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🔒</Text>
              <Text style={styles.title}>SOC Mobile TT</Text>
              <Text style={styles.subtitle}>Tunisie Telecom — Security Operations</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: fadeAnim }]}>

            <Text style={styles.label}>Nom d'utilisateur</Text>
            <TextInput
              style={[styles.input, errors.username ? styles.inputError : null]}
              placeholder="Entrez votre username"
              value={username}
              onChangeText={(text) => { setUsername(text); setErrors(e => ({ ...e, username: '' })); }}
              autoCapitalize="none"
              placeholderTextColor="#475569"
            />
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Entrez votre mot de passe"
                value={password}
                onChangeText={(text) => { setPassword(text); setErrors(e => ({ ...e, password: '' })); }}
                secureTextEntry={!showPassword}
                placeholderTextColor="#475569"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Se souvenir de moi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SE CONNECTER</Text>}
            </TouchableOpacity>

          </Animated.View>

          <Text style={styles.footer}>AI Security Platform 2026</Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f172a' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6 },
  form: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, elevation: 8 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 14, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#334155', fontSize: 15 },
  inputError: { borderColor: '#ef4444' },
  passwordContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 6, alignItems: 'center' },
  passwordInput: { flex: 1, color: '#fff', padding: 14, fontSize: 15 },
  eyeBtn: { padding: 14 },
  eyeIcon: { fontSize: 18 },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 10, marginLeft: 4 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#3b82f6', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#3b82f6' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  rememberText: { color: '#94a3b8', fontSize: 14 },
  button: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 6 },
  buttonDisabled: { backgroundColor: '#1e40af', opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  footer: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 30 },
});