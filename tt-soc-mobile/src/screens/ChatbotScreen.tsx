import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../api/axiosConfig';

// Définition des types pour la navigation
type RootStackParamList = {
  Chatbot: undefined;
  Dashboard: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Chatbot'>;

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatbotScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "👋 Bonjour ! Je suis l'assistant SOC. Pose-moi tes questions sur la cybersécurité (DDoS, Brute-Force, XSS, SQLi, etc.)",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMsgText = inputText.trim();
    
    // 1. Ajouter le message de l'utilisateur
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userMsgText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Appel à l'API
      const res = await api.post('/chatbot', { 
        message: userMsgText,
        session_id: 'mobile_session_1'
      });

      // Extraction robuste de la réponse
      let botText = "";
      
      if (res.data) {
        if (res.data.response && typeof res.data.response === 'string') {
          botText = res.data.response;
        } else if (res.data.message && typeof res.data.message === 'string') {
          botText = res.data.message;
        } else if (typeof res.data === 'string') {
          botText = res.data;
        } else {
          botText = "⚠️ J'ai reçu une réponse mais je n'arrive pas à la lire. (Voir logs)";
        }
      } else {
        botText = "⚠️ Le serveur n'a rien répondu.";
      }

      if (!botText.trim()) {
        botText = "️ Je n'ai pas pu générer de réponse pour le moment.";
      }

      // 3. Ajouter la réponse du bot
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
      
    } catch (err: any) {
      console.error("❌ Chatbot Error:", err.response?.data || err.message);
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "⚠️ Erreur de connexion au serveur. Vérifie que Flask tourne bien.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "C'est quoi un DDoS ?",
    "Comment détecter un brute-force SSH ?",
    "Que faire en cas de ransomware ?",
    "C'est quoi le SOC ?"
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}  // ✅ 'height' pour Android
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}> Assistant SOC</Text>
          <Text style={styles.headerSubtitle}>Powered by Mistral:latest</Text>
        </View>

        {/* Liste des messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"  // ✅ Permet de cliquer sur l'input avec clavier ouvert
        >
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userBubble : styles.botBubble
              ]}
            >
              <Text style={[
                styles.messageText,
                msg.sender === 'user' ? styles.userText : styles.botText
              ]}>
                {msg.text}
              </Text>
              <Text style={styles.timestamp}>
                {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
          
          {loading && (
            <View style={[styles.messageBubble, styles.botBubble]}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.botText}> Réflexion en cours...</Text>
            </View>
          )}
        </ScrollView>

        {/* Questions rapides */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickQuestionsContainer}
          keyboardShouldPersistTaps="handled"
        >
          {quickQuestions.map((q, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.quickButton}
              onPress={() => setInputText(q)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickButtonText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ✅ Zone de saisie CORRIGÉE */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Pose ta question..."
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!loading}
            pointerEvents="auto"  // ✅ Nécessaire sur TextInput pour recevoir le focus
            textAlignVertical="center"  // ✅ Centre le texte sur Android
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.7}
            // ✅ pointerEvents supprimé ici car invalide sur TouchableOpacity (TS Error)
            // Le parent 'box-none' permet au bouton de recevoir les clics naturellement
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#0f172a',
  },
  header: { 
    padding: 16, 
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    backgroundColor: '#1e293b', 
    borderBottomWidth: 1, 
    borderBottomColor: '#334155' 
  },
  backButton: { marginBottom: 8 },
  backButtonText: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageBubble: { 
    maxWidth: '85%', padding: 12, borderRadius: 14, 
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 
  },
  userBubble: { 
    alignSelf: 'flex-end', backgroundColor: '#3b82f6', 
    borderBottomRightRadius: 4 
  },
  botBubble: { 
    alignSelf: 'flex-start', backgroundColor: '#1e293b', 
    borderBottomLeftRadius: 4 
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  botText: { color: '#e2e8f0' },
  timestamp: { 
    fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'right' 
  },
  
  quickQuestionsContainer: { 
    maxHeight: 50, paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: '#0f172a' 
  },
  quickButton: { 
    backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#334155' 
  },
  quickButtonText: { color: '#cbd5e1', fontSize: 12, fontWeight: '500' },
  
  // ✅ inputContainer avec box-none pour laisser passer les clics vers les enfants
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    paddingBottom: Platform.OS === 'android' ? 25 : 12,
    backgroundColor: '#1e293b', 
    borderTopWidth: 1, 
    borderTopColor: '#334155',
    alignItems: 'flex-end',
    pointerEvents: 'box-none', // ✅ Important
    zIndex: 1000,
    elevation: 10,
  },
  
  input: { 
    flex: 1, 
    backgroundColor: '#0f172a', 
    color: '#fff', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    maxHeight: 100, 
    marginRight: 10, 
    fontSize: 15,
    textAlignVertical: 'center',
  },
  
  sendButton: { 
    backgroundColor: '#3b82f6', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 1001,
    elevation: 11,
  },
  sendButtonDisabled: { backgroundColor: '#475569' },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});