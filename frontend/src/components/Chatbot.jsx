import React, { useState, useRef, useEffect } from 'react';

const SESSION_ID = 'soc_' + Math.random().toString(36).substr(2, 9);

export default function Chatbot() {

  const [messages, setMessages] = useState([
    { sender: 'bot', text: "👋 Salut ! Pose-moi n'importe quelle question 😉" }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:5000/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: SESSION_ID })
      });

      const data = await res.json();

      setMessages(prev => [...prev, {
        sender: 'bot',
        text: data.response,
        source: data.source
      }]);

    } catch {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "⚠️ Erreur serveur"
      }]);
    }

    setLoading(false);
  };

  return (
    <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.sender === 'user' ? 'right' : 'left' }}>
            <div style={{
              display: 'inline-block',
              padding: 10,
              margin: 5,
              borderRadius: 10,
              background: m.sender === 'user' ? '#7c83fd' : '#333',
              color: 'white'
            }}>
              {m.text}
              {m.source && (
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  {m.source === 'soc_fast' && '⚡ SOC'}
                  {m.source === 'llm' && '🤖 IA'}
                  {m.source === 'fallback' && '⚠️ fallback'}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div>🤖 ...</div>}
        <div ref={endRef}></div>
      </div>

      <div style={{ display: 'flex' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && send()}
          style={{ flex: 1 }}
        />
        <button onClick={send}>Send</button>
      </div>

    </div>
  );
}