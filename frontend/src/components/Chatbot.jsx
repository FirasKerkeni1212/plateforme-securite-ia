import React, { useState, useRef, useEffect } from 'react';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Bonjour ! Je suis l'assistant SOC. Posez-moi une question sur la sécurité (ex: 'recommandations', 'dernière anomalie', 'stats')." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      // 1. Appel à ton Flask pour déterminer l'intent (ou envoi direct si tu gères l'intent côté React)
      // Pour simplifier, on va envoyer le texte brut et laisser Flask deviner ou on mappe les mots clés ici.
      // MÉTHODE SIMPLE : On mappe les mots clés en React vers les intents Flask.
      
      let intent = 'help'; // Par défaut
      
      const lowerText = userMessage.toLowerCase();
      if (lowerText.includes('recommand') || lowerText.includes('conseil') || lowerText.includes('faire') || lowerText.includes('protéger')) {
        intent = 'get_recommandations';
      } else if (lowerText.includes('stat') || lowerText.includes('nombre')) {
        intent = 'get_stats';
      } else if (lowerText.includes('dernier') || lowerText.includes('alerte') || lowerText.includes('anomalie')) {
        intent = 'get_last_anomaly';
      } else if (lowerText.includes('aide') || lowerText.includes('help')) {
        intent = 'help';
      }

      // 2. Appel API Flask
      const response = await fetch('http://127.0.0.1:5000/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: intent })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: data.response || "Désolé, je n'ai pas compris." 
      }]);

    } catch (error) {
      console.error("Erreur chatbot:", error);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: "Erreur de connexion au serveur SOC. Vérifiez que Flask tourne." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // Styles simples (à remplacer par ton CSS ou Tailwind)
  const styles = {
    container: {
      display: 'flex', flexDirection: 'column', height: '400px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff'
    },
    messages: {
      flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#f9f9f9'
    },
    inputArea: {
      display: 'flex', borderTop: '1px solid #eee', padding: '10px'
    },
    input: {
      flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginRight: '8px'
    },
    button: {
      padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
    },
    userMsg: { textAlign: 'right', margin: '5px 0' },
    botMsg: { textAlign: 'left', margin: '5px 0' },
    bubbleUser: { display: 'inline-block', padding: '8px 12px', backgroundColor: '#007bff', color: 'white', borderRadius: '12px', maxWidth: '70%' },
    bubbleBot: { display: 'inline-block', padding: '8px 12px', backgroundColor: '#e9ecef', color: '#333', borderRadius: '12px', maxWidth: '70%', whiteSpace: 'pre-wrap' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.map((msg, idx) => (
          <div key={idx} style={msg.sender === 'user' ? styles.userMsg : styles.botMsg}>
            <div style={msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div style={styles.botMsg}><em>L'assistant écrit...</em></div>}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Posez votre question..."
          style={styles.input}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading} style={styles.button}>
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default Chatbot;