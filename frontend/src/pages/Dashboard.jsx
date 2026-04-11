import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = () => {
  const [role] = useState(localStorage.getItem('role') || 'analyst');
  const [username] = useState(localStorage.getItem('username') || 'User');

  const [logText, setLogText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ analyses: 0, anomalies: 0, taux: 0 });

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ sender: 'bot', text: "Bonjour ! Je suis l'assistant SOC." }]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterCrit, setFilterCrit] = useState('all');

  // États pour la gestion des utilisateurs
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'analyst' });

  useEffect(() => {
    if (role === 'admin' && showUserModal) {
      fetchUsers();
    }
  }, [showUserModal, role]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(res.data.users);
    } catch (err) {
      console.error("Erreur chargement users", err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/users', newUser, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert("Utilisateur créé !");
      setNewUser({ username: '', password: '', role: 'analyst' });
      fetchUsers();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.error || "Échec création"));
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      alert("Erreur suppression");
    }
  };

  const handleLogout = () => { localStorage.clear(); window.location.href = '/login'; };

  const handleAnalyze = async () => {
    if (!logText.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/analyze', { log: logText }, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.data.success) {
        const data = res.data.result;
        setResult(data);
        setStats(prev => ({
          analyses: prev.analyses + 1,
          anomalies: data.is_anomaly ? prev.anomalies + 1 : prev.anomalies,
          taux: Math.round(((data.is_anomaly ? prev.anomalies + 1 : prev.anomalies) / (prev.analyses + 1)) * 100)
        }));
        const newEntry = {
          id: Date.now(), type: data.is_anomaly ? 'Anomalie' : 'Normal',
          detail: `${data.attack_type} - ${data.criticality}`, criticality: data.criticality,
          confidence: Math.round(data.confidence * 100), isAnomaly: data.is_anomaly,
          time: new Date().toLocaleTimeString(), rawLog: logText
        };
        setHistory(prev => [newEntry, ...prev].slice(0, 50));
      }
    } catch (err) { alert("Erreur backend."); } finally { setLoading(false); }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/chatbot', { message: userMsg }, { headers: { 'Authorization': `Bearer ${token}` } });
      setChatMessages(prev => [...prev, { sender: 'bot', text: res.data.response }]);
    } catch (err) { setChatMessages(prev => [...prev, { sender: 'bot', text: "Erreur bot." }]); }
  };

  const handleExport = async (type) => {
    if (!history || history.length === 0) { alert("⚠️ Aucune analyse !"); return; }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:5000/api/export/${type}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }, responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rapport_Securite_${new Date().getTime()}.${type === 'excel' ? 'xlsx' : type}`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (error) { alert("Erreur export: " + error.message); }
  };

  const filteredHistory = history.filter(item => {
    const matchSearch = item.rawLog.toLowerCase().includes(searchTerm.toLowerCase()) || item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = filterClass === 'all' || (filterClass === 'anomalie' && item.isAnomaly) || (filterClass === 'normal' && !item.isAnomaly);
    const matchCrit = filterCrit === 'all' || item.criticality.toLowerCase() === filterCrit.toLowerCase();
    return matchSearch && matchClass && matchCrit;
  });

  const trendData = history.slice(0, 10).map((h, i) => ({ name: `T${i+1}`, Anomalies: h.isAnomaly ? 1 : 0, Normal: h.isAnomaly ? 0 : 1 })).reverse();
  const classificationData = [{ name: 'Anomalies', value: history.filter(h => h.isAnomaly).length }, { name: 'Normal', value: history.filter(h => !h.isAnomaly).length }];
  const criticalityData = [
    { name: 'Critique', value: history.filter(h => h.criticality === 'critique').length },
    { name: 'Haute', value: history.filter(h => h.criticality === 'haute').length },
    { name: 'Moyenne', value: history.filter(h => h.criticality === 'moyenne').length },
    { name: 'Basse', value: history.filter(h => h.criticality === 'basse').length },
  ].filter(d => d.value > 0);
  
  const COLORS_CLASS = ['#ff4757', '#2ed573'];
  const COLORS_CRIT = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff'];

  return (
    <div className="container" style={{ maxWidth: '1600px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>🔒 Plateforme Sécurité IA</h1>
          <p className="subtitle">Dashboard Hybride RBAC</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#00d2ff', marginRight: '10px', fontSize: '0.9rem' }}>
            {username} 
            <span style={{ background: role === 'admin' ? '' : '#2ed573', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '5px' }}>
            </span>
          </span>
          
          {role === 'admin' && (
            <button onClick={() => setShowUserModal(true)} style={{ background: '#00d2ff', border: 'none', color: 'white', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', marginRight: '10px' }}>
              👥 Gérer Users
            </button>
          )}

          <button onClick={handleLogout} style={{ background: 'rgba(255, 71, 87, 0.2)', border: '1px solid #ff4757', color: '#ff6b6b', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' }}>Déconnexion</button>
        </div>
      </div>

      {/* MODAL GESTION USERS */}
      {showUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#2c3e50', padding: '30px', borderRadius: '10px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#ffa502', marginTop: 0 }}>👥 Gestion des Utilisateurs</h2>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '10px', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
              <input placeholder="Nom d'utilisateur" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#34495e', color: 'white' }} />
              <input type="password" placeholder="Mot de passe" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#34495e', color: 'white' }} />
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#34495e', color: 'white' }}>
                <option value="analyst">Analyste</option>
                <option value="admin">Administrateur</option>
              </select>
              <button type="submit" style={{ background: '#2ed573', border: 'none', padding: '10px', borderRadius: '5px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Créer Utilisateur</button>
            </form>
            <h3 style={{ color: '#fff' }}>Utilisateurs Existants</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {users.map(u => (
                <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', marginBottom: '5px', borderRadius: '5px' }}>
                  <span>{u.username} <span style={{ fontSize: '0.8em', color: '#aaa' }}>({u.role})</span></span>
                  {u.username !== username && (
                    <button onClick={() => handleDeleteUser(u.id)} style={{ background: '#ff4757', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Supprimer</button>
                  )}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowUserModal(false)} style={{ marginTop: '20px', width: '100%', background: '#7f8c8d', border: 'none', padding: '10px', borderRadius: '5px', color: 'white', cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {/* LIGNE 1 : Saisie + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <div className="card">
            <h2 style={{ color: '#00d2ff', marginBottom: '15px' }}>📄 Analyser un log</h2>
            <textarea rows="4" placeholder="Collez votre log ici..." value={logText} onChange={(e) => setLogText(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '10px', padding: '15px', color: 'white', fontFamily: 'monospace' }} />
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="analyze-btn" onClick={handleAnalyze} disabled={loading}>{loading ? 'Analyse...' : '🧪 Analyser avec l\'IA'}</button>
              <button onClick={() => handleExport('pdf')} style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer' }}>📄 PDF</button>
              <button onClick={() => handleExport('excel')} style={{ background: 'rgba(46, 213, 115, 0.2)', border: '1px solid #2ed573', color: '#2ed573', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer' }}>📊 Excel</button>
              <button onClick={() => handleExport('html')} style={{ background: 'rgba(52, 152, 219, 0.2)', border: '1px solid #3498db', color: '#3498db', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer' }}>🌐 HTML</button>
            </div>
          </div>
          {result && (
            <div className={`result-card ${result.is_anomaly ? 'danger' : 'safe'}`} style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '15px' }}>{result.is_anomaly ? '🚨 Anomalie Détectée' : '✅ Trafic Normal'}</h3>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div><span style={{color:'#aaa'}}>Classification</span><p style={{fontWeight:'bold'}}>{result.is_anomaly ? 'Anomalie' : 'Normal'}</p></div>
                <div><span style={{color:'#aaa'}}>Confiance</span><p style={{fontWeight:'bold'}}>{Math.round(result.confidence * 100)}%</p></div>
                <div><span style={{color:'#aaa'}}>Statut</span><p style={{fontWeight:'bold'}}>{result.is_anomaly ? 'OUI' : 'NON'}</p></div>
                <div><span style={{color:'#aaa'}}>Criticité</span><p style={{fontWeight:'bold', textTransform:'uppercase'}}>{result.criticality}</p></div>
              </div>
              <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <strong>Analyse :</strong> {result.summary}
                {result.actions && result.actions.length > 0 && (<ul style={{ paddingLeft: '20px', margin: '5px 0', color: '#ddd' }}>{result.actions.map((action, i) => <li key={i}>{action}</li>)}</ul>)}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h2 style={{ color: '#00d2ff', marginBottom: '15px' }}>📊 Statistiques Globales</h2>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}><span style={{color:'#aaa'}}>Analyses effectuées</span><span style={{fontWeight:'bold', fontSize:'1.2rem'}}>{stats.analyses}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}><span style={{color:'#aaa'}}>Anomalies détectées</span><span style={{fontWeight:'bold', fontSize:'1.2rem', color:'#ff4757'}}>{stats.anomalies}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}><span style={{color:'#aaa'}}>Taux détection</span><span style={{fontWeight:'bold', fontSize:'1.2rem', color:'#00d2ff'}}>{stats.taux}%</span></div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
            <h4 style={{ color: '#2ed573', marginBottom: '10px' }}>✅ Statut Serveurs</h4>
            <p style={{ fontSize: '0.9rem', color: '#ddd', marginBottom: '5px' }}>🟢 Backend Flask ● En ligne</p>
            <p style={{ fontSize: '0.9rem', color: '#ddd', marginBottom: '5px' }}>🟢 Frontend React ● En ligne</p>
            <p style={{ fontSize: '0.9rem', color: '#ddd' }}>🟢 Prometheus ● En ligne</p>
          </div>
        </div>
      </div>

      {/* LIGNE 2 : Graphiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '15px' }}>
          <h4 style={{ color: '#ff4757', marginBottom: '15px', fontSize: '0.9rem' }}>📈 Tendances Détections</h4>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="name" hide /><YAxis stroke="#aaa" fontSize={10} /><Tooltip contentStyle={{ backgroundColor: '#2c5364', border: 'none' }} /><Legend wrapperStyle={{ fontSize: '12px' }} /><Line type="monotone" dataKey="Anomalies" stroke="#ff4757" strokeWidth={2} /><Line type="monotone" dataKey="Normal" stroke="#2ed573" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card" style={{ padding: '25px' }}>
          <h4 style={{ color: '#ff6b6b', marginBottom: '15px', fontSize: '0.9rem' }}>🥧 Classification des Logs</h4>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={classificationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} fill="#8884d8" paddingAngle={5} dataKey="value" label>
                  {classificationData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS_CLASS[index % COLORS_CLASS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#2c5364', border: 'none' }} />
                <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '25px' }}>
          <h4 style={{ color: '#ffa502', marginBottom: '10px', fontSize: '0.9rem' }}>⚠️ Répartition Criticité</h4>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={criticalityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#aaa" fontSize={10} />
                <YAxis stroke="#aaa" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#2c5364', border: 'none' }} />
                <Bar dataKey="value" fill="#ffa502" label={{ position: 'top', fill: '#ffa502', fontSize: 12 }}>
                  {criticalityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS_CRIT[index % COLORS_CRIT.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card" style={{ padding: '15px' }}>
          <h4 style={{ color: '#00d2ff', marginBottom: '10px', fontSize: '0.9rem' }}>🎯 Confiance par Analyse (%)</h4>
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
             <div>
               <p style={{ color: '#aaa', fontSize: '1.1rem', marginBottom: '10px' }}>
                 La confiance est affichée<br/>dans l'historique détaillé.
               </p>
               {history.length > 0 && (
                 <p style={{ color: '#00d2ff', fontSize: '1.5rem', fontWeight: 'bold' }}>
                   Moyenne : {Math.round(history.reduce((acc, curr) => acc + curr.confidence, 0) / history.length)}%
                 </p>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* LIGNE 3 : Chatbot & Filtres (Côte à côte) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
        {/* Chatbot */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <h3 style={{ color: '#00d2ff', marginBottom: '10px' }}>🤖 Assistant SOC</h3>
          <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
            {chatMessages.map((msg, idx) => (<div key={idx} style={{ marginBottom: '8px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}><span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: '12px', background: msg.sender === 'user' ? '#00d2ff' : '#444', color: 'white', fontSize: '0.85rem' }}>{msg.text}</span></div>))}
          </div>
          <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '5px' }}>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Question..." style={{ flex: 1, padding: '8px', borderRadius: '15px', border: 'none', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.9rem' }} />
            <button type="submit" style={{ background: '#00d2ff', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', color: 'white' }}>➤</button>
          </form>
        </div>

        {/* Filtres */}
        <div className="card">
          <h3 style={{ color: '#00d2ff',  textAlign: 'center' }}>🔍 Filtres & Recherche</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', alignItems: 'end', height: '100%' }}>
            <div><label style={{ display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '0.85rem' }}>Rechercher dans les logs :</label><input type="text" placeholder="IP, Type d'attaque, Mot-clé..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '0.85rem' }}>Classification :</label><select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white', boxSizing: 'border-box' }}><option value="all">Toutes (Normal/Anomalie)</option><option value="anomalie">Anomalie</option><option value="normal">Normal</option></select></div>
            <div><label style={{ display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '0.85rem' }}>Criticité :</label><select value={filterCrit} onChange={(e) => setFilterCrit(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white', boxSizing: 'border-box' }}><option value="all">Toutes Criticités</option><option value="critique">Critique</option><option value="haute">Haute</option><option value="moyenne">Moyenne</option><option value="basse">Basse</option></select></div>
            <div style={{ gridColumn: '1 / -1', marginTop: '5px', color: '#2ed573', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>Résultats filtrés : {filteredHistory.length} log(s)</div>
          </div>
        </div>
      </div>

      {/* LIGNE 4 : Historique Détaillé (En bas, pleine largeur) */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#00d2ff', marginBottom: '15px' }}>🕒 Historique Détaillé</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {filteredHistory.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>Aucun résultat trouvé. Lancez une analyse ou ajustez les filtres.</p>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #444', color: '#aaa', position: 'sticky', top: 0, background: '#2c3e50' }}>
                  <th style={{ padding: '12px 8px' }}>Heure</th>
                  <th style={{ padding: '12px 8px' }}>Type</th>
                  <th style={{ padding: '12px 8px' }}>Détail</th>
                  <th style={{ padding: '12px 8px' }}>Criticité</th>
                  <th style={{ padding: '12px 8px' }}>Confiance</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px 8px', color: '#aaa' }}>{item.time}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ color: item.isAnomaly ? '#ff4757' : '#2ed573', fontWeight: 'bold' }}>{item.type}</span>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#ddd', fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.detail}</td>
                    <td style={{ padding: '12px 8px', textTransform: 'uppercase', fontSize: '0.85rem', color: '#ffa502' }}>{item.criticality}</td>
                    <td style={{ padding: '12px 8px', color: '#00d2ff', fontWeight: 'bold' }}>{item.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer style={{ marginTop: '30px', color: '#777', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', textAlign: 'center' }}>
        Plateforme Sécurité IA - Créée par <strong style={{ color: '#00d2ff' }}>Firas Kerkeni</strong> | Architecture Hybride Cloud/On-Premise
      </footer>
    </div>
  );
};

export default Dashboard;