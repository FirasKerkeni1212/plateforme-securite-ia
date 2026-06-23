import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../index.css';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

// ─── Parser ───────────────────────────────────────────────────────────────────
const parseLogFile = (text) => {
  const blocks = [];
  const normalized = text.replace(/\r\n/g, '\n');
  const sections = normalized.split(/\n\s*\n/).filter(s => s.trim());
  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;
    const firstLine = lines[0].trim();
    if (lines.some(l => l.trim().startsWith('curl'))) {
      const fullBlock = lines.join('\n');
      let match = fullBlock.match(/-d\s+'{"log":\s*"((?:[^"\\]|\\.)*)"/s);
      if (match) { blocks.push({ label: firstLine, log: match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') }); continue; }
      match = fullBlock.match(/-d\s+"{\\"log\\":\s*\\"((?:[^"\\]|\\.)*)\\"/s);
      if (match) { blocks.push({ label: firstLine, log: match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') }); continue; }
      match = fullBlock.match(/-d\s+['"](.+)/s);
      if (match) { blocks.push({ label: firstLine, log: match[1].replace(/\\n/g, '\n') }); continue; }
    }
    if (!firstLine.startsWith('curl') && !firstLine.startsWith('-')) {
      const logContent = lines.slice(1).join('\n').trim();
      if (logContent) blocks.push({ label: firstLine, log: logContent });
    }
  }
  return blocks;
};

// IPs privées/locales à ignorer
const isPrivateIP = (ip) => {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|0\.0\.0\.0|localhost)/.test(ip);
};

// ─── Composant carte ──────────────────────────────────────────────────────────
const AttackMap = ({ geoPoints }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const critColor = (crit) => {
    if (crit === 'critical') return '#ff4757';
    if (crit === 'high') return '#ffa502';
    if (crit === 'medium') return '#2ed573';
    return '#1e90ff';
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [20, 0], zoom: 2, scrollWheelZoom: false,
      zoomControl: true
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO'
    }).addTo(mapInstanceRef.current);
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    geoPoints.forEach(pt => {
      const color = critColor(pt.criticality);
      const marker = L.circleMarker([pt.lat, pt.lon], {
        radius: 10, color, fillColor: color,
        fillOpacity: 0.8, weight: 2
      }).addTo(mapInstanceRef.current);
      marker.bindPopup(`
        <div style="min-width:160px;color:#e0e6f0">
          <strong style="color:${color}">${(pt.criticality || 'unknown').toUpperCase()}</strong><br/>
          <b>IP :</b> ${pt.ip}<br/>
          <b>Type :</b> ${pt.attackType}<br/>
          <b>Pays :</b> ${pt.country}<br/>
          <b>Ville :</b> ${pt.city}<br/>
          <b>Confiance :</b> ${pt.confidence}%
        </div>
      `);
      markersRef.current.push(marker);
    });
  }, [geoPoints]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '12px' }} />
  );
};


// ─── Composant principal ──────────────────────────────────────────────────────
const Dashboard = () => {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [role] = useState(storedUser.role || 'analyst');
  const [username] = useState(storedUser.username || 'User');

  // ── Thème (Dark / Light) ─────────────────────────────────────────────────────
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const [logText, setLogText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const [batchProgress, setBatchProgress] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);

  const [criticalAlertes, setCriticalAlertes] = useState([]);
  const [exportingPDF, setExportingPDF] = useState(false);

  const [geoPoints, setGeoPoints] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const geoCache = useRef({});

  const refTrend = useRef(null);
  const refPie = useRef(null);
  const refBar = useRef(null);

  const extractIP = (logRaw) => {
    const match = logRaw.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
    return match ? match[1] : null;
  };
  const dismissAlerte = (id) => setCriticalAlertes(prev => prev.filter(a => a.id !== id));

  const [stats, setStats] = useState({ analyses: 0, anomalies: 0, detectionRate: 0 });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ sender: 'bot', text: "Hello! I'm the SOC Assistant." }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterCrit, setFilterCrit] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'analyst' });

  useEffect(() => { if (role === 'admin' && showUserModal) fetchUsers(); }, [showUserModal, role]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      setUsers(res.data.users);
    } catch (err) { console.error("Error loading users", err); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/users', newUser, { headers: { 'Authorization': `Bearer ${token}` } });
      alert("User created successfully!");
      setNewUser({ username: '', password: '', role: 'analyst' });
      fetchUsers();
    } catch (err) { alert("Error: " + (err.response?.data?.error || "Creation failed")); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchUsers();
    } catch (err) { alert("Deletion error"); }
  };

  const handleLogout = () => { localStorage.clear(); window.location.href = '/login'; };

  const analyzeSingleLog = async (log, token) => {
    const res = await axios.post('http://localhost:5000/api/analyze', { log }, { headers: { 'Authorization': `Bearer ${token}` } });
    return res.data;
  };

  const geolocateIP = useCallback(async (ip, attackType, criticality, confidence) => {
    if (!ip || isPrivateIP(ip)) return;
    if (geoCache.current[ip]) {
      const cached = geoCache.current[ip];
      setGeoPoints(prev => {
        const exists = prev.find(p => p.ip === ip && p.attackType === attackType);
        if (exists) return prev;
        return [...prev, { ...cached, attackType, criticality, confidence }];
      });
      return;
    }
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`);
      const data = await res.json();
      if (data.status === 'success') {
        geoCache.current[ip] = { ip, lat: data.lat, lon: data.lon, country: data.country, city: data.city };
        setGeoPoints(prev => {
          const exists = prev.find(p => p.ip === ip && p.attackType === attackType);
          if (exists) return prev;
          return [...prev, { ip, lat: data.lat, lon: data.lon, country: data.country, city: data.city, attackType, criticality, confidence }];
        });
      }
    } catch (err) { console.error('Geo error:', err); }
  }, []);

  const addEntryToHistory = useCallback((data, logRaw) => {
    const entry = {
      id: Date.now() + Math.random(),
      type: data.is_anomaly ? 'Anomaly' : 'Normal',
      detail: data.is_anomaly ? `${data.attack_type} - ${data.criticality?.toUpperCase()}` : 'Normal Traffic',
      criticality: data.criticality?.toLowerCase(),
      confidence: Math.round((data.confidence || 0) * 100),
      isAnomaly: data.is_anomaly,
      time: new Date().toLocaleTimeString(),
      rawLog: logRaw
    };
    setHistory(prev => [entry, ...prev].slice(0, 50));
    setStats(prev => {
      const newAnomalies = data.is_anomaly ? prev.anomalies + 1 : prev.anomalies;
      const newAnalyses = prev.analyses + 1;
      return { analyses: newAnalyses, anomalies: newAnomalies, detectionRate: Math.round((newAnomalies / newAnalyses) * 100) };
    });
    if (data.is_anomaly) {
      const ip = extractIP(logRaw);
      if (data.criticality?.toLowerCase() === 'critical') {
        const alerteId = Date.now() + Math.random();
        setCriticalAlertes(prev => [...prev, { id: alerteId, attackType: data.attack_type || 'Unknown', ip, confidence: Math.round((data.confidence || 0) * 100) }]);
        setTimeout(() => dismissAlerte(alerteId), 5000);
      }
      if (ip && !isPrivateIP(ip)) {
        geolocateIP(ip, data.attack_type || 'Unknown', data.criticality?.toLowerCase(), Math.round((data.confidence || 0) * 100));
      }
    }
    return entry;
  }, [geolocateIP]);

  const handleAnalyze = async () => {
    if (!logText.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await analyzeSingleLog(logText, token);
      if (res.success) { setResult(res.result); addEntryToHistory(res.result, logText); }
    } catch (err) { alert("Backend error."); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const blocks = parseLogFile(text);
    if (blocks.length <= 1) { setLogText(text); return; }
    const go = window.confirm(`📂 ${blocks.length} attaques détectées dans le fichier :\n` + blocks.map((b, i) => `  ${i + 1}. ${b.label}`).join('\n') + '\n\nLancer l\'analyse par lot ?');
    if (!go) { setLogText(text); return; }
    setBatchRunning(true);
    setBatchProgress({ current: 0, total: blocks.length, label: '' });
    const token = localStorage.getItem('token');
    let lastResult = null;
    for (let i = 0; i < blocks.length; i++) {
      const { label, log } = blocks[i];
      setBatchProgress({ current: i + 1, total: blocks.length, label });
      try {
        const res = await analyzeSingleLog(log, token);
        if (res.success) { lastResult = res.result; addEntryToHistory(res.result, log); }
      } catch (err) { console.error(`Erreur sur ${label}:`, err); }
      await new Promise(r => setTimeout(r, 300));
    }
    if (lastResult) setResult(lastResult);
    setBatchRunning(false);
    setBatchProgress(null);
    setLogText('✅ Batch terminé — ' + blocks.length + ' logs analysés.');
  };

  const handleExportPDF = async () => {
    if (!history || history.length === 0) { alert("⚠️ No analysis data!"); return; }
    setExportingPDF(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const margin = 15; let y = margin;
      pdf.setFillColor(18, 30, 49); pdf.rect(0, 0, W, 40, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
      pdf.text('AI Security Platform', margin, 18);
      pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
      pdf.text('SOC Analysis Report — Generated by Firas Kerkeni', margin, 27);
      pdf.text(`Date: ${new Date().toLocaleString()}`, margin, 34);
      y = 50;
      pdf.setFillColor(30, 45, 70); pdf.roundedRect(margin, y, W - 2 * margin, 28, 4, 4, 'F');
      const anomalies = history.filter(h => h.isAnomaly).length;
      const normal = history.length - anomalies;
      const avgConf = Math.round(history.reduce((a, c) => a + (c.confidence || 0), 0) / history.length);
      const detRate = Math.round((anomalies / history.length) * 100);
      const statCols = [
        { label: 'Total Analyses', value: String(history.length), color: [100, 200, 255] },
        { label: 'Anomalies', value: String(anomalies), color: [255, 71, 87] },
        { label: 'Normal', value: String(normal), color: [46, 213, 115] },
        { label: 'Detection Rate', value: `${detRate}%`, color: [100, 200, 255] },
        { label: 'Avg Confidence', value: `${avgConf}%`, color: [255, 165, 2] },
      ];
      const colW = (W - 2 * margin) / statCols.length;
      statCols.forEach((s, i) => {
        const cx = margin + i * colW + colW / 2;
        pdf.setTextColor(...s.color); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
        pdf.text(s.value, cx, y + 13, { align: 'center' });
        pdf.setTextColor(180, 180, 180); pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
        pdf.text(s.label, cx, y + 21, { align: 'center' });
      });
      y += 36;
      const chartRefs = [{ ref: refTrend, title: 'Detection Trends' }, { ref: refPie, title: 'Log Classification' }, { ref: refBar, title: 'Criticity Distribution' }];
      const chartW = (W - 2 * margin - 8) / 3; const chartH = 45;
      chartRefs.forEach((c, i) => { pdf.setTextColor(160, 180, 220); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.text(c.title, margin + i * (chartW + 4) + chartW / 2, y + 5, { align: 'center' }); });
      y += 8;
      for (let i = 0; i < chartRefs.length; i++) {
        const el = chartRefs[i].ref.current;
        if (el) {
          const canvas = await html2canvas(el, { backgroundColor: '#1a2540', scale: 2, logging: false });
          const imgData = canvas.toDataURL('image/png');
          const x = margin + i * (chartW + 4);
          pdf.setFillColor(26, 37, 64); pdf.roundedRect(x, y, chartW, chartH, 3, 3, 'F');
          pdf.addImage(imgData, 'PNG', x + 1, y + 1, chartW - 2, chartH - 2);
        }
      }
      y += chartH + 10;
      pdf.setFillColor(18, 30, 49); pdf.rect(0, y - 2, W, 8, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Analysis History', margin, y + 4); y += 12;
      const cols = ['Time', 'Type', 'Detail', 'Criticity', 'Confidence'];
      const colWidths = [22, 22, 72, 25, 25]; let x = margin;
      pdf.setFillColor(30, 50, 90); pdf.rect(margin, y - 4, W - 2 * margin, 8, 'F');
      pdf.setTextColor(180, 200, 255); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
      cols.forEach((col, i) => { pdf.text(col, x + 2, y + 1); x += colWidths[i]; }); y += 7;
      pdf.setFont('helvetica', 'normal');
      history.forEach((item, idx) => {
        if (y > 270) { pdf.addPage(); y = margin; }
        const bg = idx % 2 === 0 ? [22, 35, 58] : [26, 42, 68];
        pdf.setFillColor(...bg); pdf.rect(margin, y - 3, W - 2 * margin, 7, 'F');
        let rx = margin;
        const critColor = item.criticality === 'critical' ? [255, 71, 87] : item.criticality === 'high' ? [255, 165, 2] : item.criticality === 'medium' ? [46, 213, 115] : [100, 200, 255];
        const rowData = [
          { text: item.time, color: [160, 170, 190] }, { text: item.type, color: item.isAnomaly ? [255, 71, 87] : [46, 213, 115] },
          { text: item.detail, color: [220, 225, 235] }, { text: item.isAnomaly ? (item.criticality?.toUpperCase() || '—') : '—', color: item.isAnomaly ? critColor : [120, 130, 150] },
          { text: `${item.confidence}%`, color: [100, 200, 255] },
        ];
        rowData.forEach((cell, i) => { pdf.setTextColor(...cell.color); pdf.setFontSize(7.5); const txt = pdf.splitTextToSize(cell.text, colWidths[i] - 4)[0]; pdf.text(txt, rx + 2, y + 1); rx += colWidths[i]; });
        y += 7;
      });
      const pageCount = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) { pdf.setPage(p); pdf.setFillColor(18, 30, 49); pdf.rect(0, 287, W, 10, 'F'); pdf.setTextColor(100, 120, 160); pdf.setFontSize(7); pdf.text('AI Security Platform — Tunisie Telecom SOC | Firas Kerkeni © 2026', margin, 293); pdf.text(`Page ${p} / ${pageCount}`, W - margin, 293, { align: 'right' }); }
      pdf.save(`SOC_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) { console.error('PDF error:', err); alert('Erreur PDF.'); }
    finally { setExportingPDF(false); }
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
    } catch (err) { setChatMessages(prev => [...prev, { sender: 'bot', text: "Bot connection error." }]); }
  };

  const handleExport = async (type) => {
    if (!history || history.length === 0) { alert("No analysis data!"); return; }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:5000/api/export/${type}`, {}, { headers: { 'Authorization': `Bearer ${token}` }, responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Security_Report_${new Date().getTime()}.${type === 'excel' ? 'xlsx' : type}`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (error) { alert("Export error: " + error.message); }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchSearch = item.rawLog.toLowerCase().includes(searchTerm.toLowerCase()) || item.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = filterClass === 'all' || (filterClass === 'anomaly' && item.isAnomaly) || (filterClass === 'normal' && !item.isAnomaly);
      const matchCrit = filterCrit === 'all' || item.criticality?.toLowerCase() === filterCrit.toLowerCase();
      return matchSearch && matchClass && matchCrit;
    });
  }, [history, searchTerm, filterClass, filterCrit]);

  const trendData = history.slice(0, 10).map((h, i) => ({ name: `T${i + 1}`, anomalies: h.isAnomaly ? 1 : 0, Normal: h.isAnomaly ? 0 : 1 })).reverse();
  const classificationData = [{ name: 'Anomalies', value: history.filter(h => h.isAnomaly).length }, { name: 'Normal', value: history.filter(h => !h.isAnomaly).length }];
  const criticalityData = [
    { name: 'CRITICAL', value: history.filter(h => h.criticality === 'critical').length },
    { name: 'HIGH', value: history.filter(h => h.criticality === 'high').length },
    { name: 'MEDIUM', value: history.filter(h => h.criticality === 'medium').length },
    { name: 'LOW', value: history.filter(h => h.criticality === 'low').length },
  ].filter(d => d.value > 0);

  const COLORS_CLASS = ['#ff4757', '#2ed573'];
  const COLORS_CRIT = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff'];
  const batchPercent = batchProgress ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0;

  return (
    <div className="container" style={{ maxWidth: '1600px' }}>

      {criticalAlertes.length > 0 && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {criticalAlertes.map(alerte => (
            <div key={alerte.id} style={{ background: 'linear-gradient(135deg, #ff0000, #8b0000)', border: '2px solid #ff4757', borderRadius: 12, padding: '14px 18px', minWidth: 320, boxShadow: '0 0 30px rgba(255,71,87,0.7)', animation: 'criticalBlink 0.6s ease-in-out infinite alternate', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: '1.6rem', marginTop: 2 }}>🚨</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', marginBottom: 4 }}>ALERTE CRITIQUE DÉTECTÉE</div>
                <div style={{ color: '#ffd0d0', fontSize: '0.85rem' }}><strong>Type :</strong> {alerte.attackType}</div>
                {alerte.ip && <div style={{ color: '#ffd0d0', fontSize: '0.85rem' }}><strong>IP Source :</strong> {alerte.ip}</div>}
                <div style={{ color: '#ffd0d0', fontSize: '0.85rem' }}><strong>Confiance :</strong> {alerte.confidence}%</div>
              </div>
              <button onClick={() => dismissAlerte(alerte.id)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes criticalBlink {
          from { box-shadow: 0 0 20px rgba(255,71,87,0.5); border-color: #ff4757; }
          to   { box-shadow: 0 0 40px rgba(255,71,87,1);   border-color: #ff0000; }
        }
        .leaflet-container { background: #0d1b2a !important; }
        .leaflet-popup-content-wrapper { background: #1a2540; color: #e0e6f0; border: 1px solid #2d4a7a; border-radius: 8px; }
        .leaflet-popup-tip { background: #1a2540; }
      `}</style>

      <header className="modern-header">
        <div className="header-left">
          <div className="logo-container">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div className="logo-text">
              <h1 className="platform-name">AI Security Platform</h1>
              <p className="platform-subtitle">Hybrid RBAC Dashboard</p>
            </div>
          </div>
        </div>
        <div className="header-right">

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>

          <div className="user-menu">
            <div className="user-avatar"><span>{username.charAt(0).toUpperCase()}</span></div>
            <div className="user-info">
              <span className="username">{username}</span>
              <span className={`role-badge ${role}`}>{role?.toUpperCase()}</span>
            </div>
          </div>
          {role === 'admin' && (
            <button className="btn-manage-users" onClick={() => setShowUserModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Manage Users</span>
            </button>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">User Management</h2>
            <form onSubmit={handleCreateUser} className="modal-form">
              <input placeholder="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required className="input-field" />
              <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required className="input-field" />
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="input-field">
                <option value="analyst">Analyst</option>
                <option value="admin">Administrator</option>
              </select>
              <button type="submit" className="auth-button">Create User</button>
            </form>
            <h3 className="modal-subtitle">Existing Users</h3>
            <ul className="users-list">
              {users.map(u => (
                <li key={u.id} className="user-item">
                  <span>{u.username} <span className="user-role">({u.role})</span></span>
                  {u.username !== username && <button onClick={() => handleDeleteUser(u.id)} className="btn-delete">Delete</button>}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowUserModal(false)} className="btn-close">Close</button>
          </div>
        </div>
      )}

      <div className="dashboard-grid-2">
        <div>
          <div className="card">
            <h2 className="card-title text-gradient">📄 Analyze a Log</h2>
            <textarea rows="4" placeholder="Paste your log here..." value={logText} onChange={(e) => setLogText(e.target.value)} className="modern-input" disabled={batchRunning} />
            {batchRunning && batchProgress && (
              <div style={{ margin: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>🔄 Analyse en cours : <strong style={{ color: '#7c6fcd' }}>{batchProgress.label}</strong></span>
                  <span style={{ color: '#7c6fcd', fontSize: '0.85rem', fontWeight: 'bold' }}>{batchProgress.current}/{batchProgress.total}</span>
                </div>
                <div style={{ background: '#2d3748', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${batchPercent}%`, height: '100%', background: 'linear-gradient(90deg, #6c5ce7, #00b4d8)', borderRadius: 8, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ textAlign: 'right', color: '#7c6fcd', fontSize: '0.8rem', marginTop: 2 }}>{batchPercent}%</div>
              </div>
            )}
            <div className="button-group">
              <button className="analyze-btn" onClick={handleAnalyze} disabled={loading || batchRunning}>{loading ? 'Analyzing...' : '🧪 Analyze with AI'}</button>
              <label className="export-btn" style={{ cursor: batchRunning ? 'not-allowed' : 'pointer', backgroundColor: '#6c5ce7', opacity: batchRunning ? 0.6 : 1 }}>
                📂 Import File
                <input type="file" accept=".log,.txt,.csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={batchRunning} />
              </label>
              <button onClick={handleExportPDF} className="export-btn pdf" disabled={exportingPDF}>{exportingPDF ? '⏳...' : '📄 PDF'}</button>
              <button onClick={() => handleExport('excel')} className="export-btn excel">📊 Excel</button>
              <button onClick={() => handleExport('html')} className="export-btn html">🌐 HTML</button>
            </div>
          </div>

          {result && (
            <div className={`result-card ${result.is_anomaly ? 'danger' : 'safe'}`}>
              <h3 className="result-title">{result.is_anomaly ? '🚨 Anomaly Detected' : '✅ Normal Traffic'}</h3>
              <div className="result-grid">
                <div className="result-item"><span className="result-label">Classification</span><p className="result-value">{result.is_anomaly ? 'Anomaly' : 'Normal'}</p></div>
                <div className="result-item"><span className="result-label">Confidence</span><p className="result-value">{Math.round((result.confidence || 0) * 100)}%</p></div>
                <div className="result-item"><span className="result-label">Status</span><p className="result-value">{result.is_anomaly ? 'YES' : 'NO'}</p></div>
                <div className="result-item"><span className="result-label">Criticity</span><p className="result-value criticality">{result.is_anomaly ? result.criticality?.toUpperCase() : 'N/A'}</p></div>
              </div>
              <div className="result-analysis">
                <strong>Analysis:</strong> {result.summary}
                {result.actions && result.actions.length > 0 && <ul className="result-actions">{result.actions.map((action, i) => <li key={i}>{action}</li>)}</ul>}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title text-gradient">📊 Global Statistics</h2>
          <div className="stats-list">
            <div className="stat-item"><span className="stat-label">Analyses Performed</span><span className="stat-value info">{stats.analyses}</span></div>
            <div className="stat-item"><span className="stat-label">Anomalies Detected</span><span className="stat-value danger">{stats.anomalies}</span></div>
            <div className="stat-item"><span className="stat-label">Detection Rate</span><span className="stat-value info">{stats.detectionRate}%</span></div>
          </div>
          <div className="server-status">
            <h4 className="server-title">✅ Server Status</h4>
            <div className="server-item"><span className="server-dot"></span><span>🟢 Flask Backend ● Online</span></div>
            <div className="server-item"><span className="server-dot"></span><span>🟢 React Frontend ● Online</span></div>
            <div className="server-item"><span className="server-dot"></span><span>🟢 Prometheus ● Online</span></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-4">
        <div className="card chart-container" ref={refTrend}>
          <h4 className="chart-title text-danger">📈 Detection Trends</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#aaa" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#2c5364', border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="anomalies" stroke="#ff4757" strokeWidth={2} />
                <Line type="monotone" dataKey="Normal" stroke="#2ed573" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card chart-container" ref={refPie}>
          <h4 className="chart-title text-danger">🥧 Log Classification</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={classificationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                  {classificationData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_CLASS[index % COLORS_CLASS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#2c5364', border: 'none' }} />
                <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card chart-container" ref={refBar}>
          <h4 className="chart-title text-warning">⚠️ Criticity Distribution</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={criticalityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#aaa" fontSize={10} />
                <YAxis stroke="#aaa" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#2c5364', border: 'none' }} />
                <Bar dataKey="value" fill="#ffa502" label={{ position: 'top', fill: '#ffa502', fontSize: 12 }}>
                  {criticalityData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_CRIT[index % COLORS_CRIT.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card chart-container">
          <h4 className="chart-title text-info">🎯 Confidence by Analysis (%)</h4>
          <div className="chart-empty">
            <p className="chart-empty-text">Confidence is displayed<br />in the detailed history.</p>
            {history.length > 0 && <p className="chart-average">Average: {Math.round(history.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / history.length)}%</p>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="card-title text-gradient" style={{ margin: 0 }}>🌍 Attack Origins Map</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {[['#ff4757', 'CRITICAL'], ['#ffa502', 'HIGH'], ['#2ed573', 'MEDIUM'], ['#1e90ff', 'LOW']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>{label}</span>
              </div>
            ))}
            <span style={{ color: '#a0aec0', fontSize: '0.85rem', marginLeft: 8 }}>
              {geoPoints.length} IP{geoPoints.length > 1 ? 's' : ''} géolocalisée{geoPoints.length > 1 ? 's' : ''}
            </span>
            {geoPoints.length > 0 && (
              <button onClick={() => setGeoPoints([])} style={{ background: 'transparent', border: '1px solid #4a5568', borderRadius: 6, color: '#a0aec0', fontSize: '0.8rem', padding: '4px 10px', cursor: 'pointer' }}>
                Effacer
              </button>
            )}
          </div>
        </div>

        {geoPoints.length === 0 ? (
          <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4a5568', border: '2px dashed #2d3748', borderRadius: 12 }}>
            <span style={{ fontSize: '2.5rem', marginBottom: 8 }}>🌍</span>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>Aucune IP publique détectée pour l'instant.</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#374151' }}>Les IPs publiques des attaques apparaîtront ici automatiquement.</p>
          </div>
        ) : (
          <AttackMap geoPoints={geoPoints} />
        )}
      </div>

      <div className="dashboard-grid-chat">
        <div className="card chat-container">
          <h3 className="chat-title text-gradient">🤖 SOC Assistant</h3>
          <div className="chat-messages">
            {chatMessages.map((msg, idx) => <div key={idx} className={`chat-message ${msg.sender}`}><span>{msg.text}</span></div>)}
          </div>
          <form onSubmit={handleChatSubmit} className="chat-form">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask a question..." className="chat-input" />
            <button type="submit" className="chat-submit">➤</button>
          </form>
        </div>
        <div className="card">
          <h3 className="card-title text-center text-gradient">🔍 Filters & Search</h3>
          <div className="filter-section">
            <div className="filter-group">
              <label className="filter-label">Search in logs:</label>
              <input type="text" placeholder="IP, Attack Type, Keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="modern-input" />
            </div>
            <div className="filter-group">
              <label className="filter-label">Classification:</label>
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="modern-input">
                <option value="all">All (Normal/Anomaly)</option>
                <option value="anomaly">Anomaly</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Criticity:</label>
              <select value={filterCrit} onChange={(e) => setFilterCrit(e.target.value)} className="modern-input">
                <option value="all">All Criticities</option>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
            <div className="filter-results">Filtered Results: {filteredHistory.length} log(s)</div>
          </div>
        </div>
      </div>

      <div className="card history-card">
        <h3 className="card-title text-gradient">🕒 Detailed History</h3>
        <div className="history-scroll">
          {filteredHistory.length === 0 ? (
            <p className="history-empty">No results found. Run an analysis or adjust filters.</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr className="table-header">
                  <th className="table-th">Time</th><th className="table-th">Type</th>
                  <th className="table-th">Detail</th><th className="table-th">Criticity</th>
                  <th className="table-th">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="table-td time">{item.time}</td>
                    <td className="table-td"><span className={`badge-type ${item.isAnomaly ? 'anomaly' : 'normal'}`}>{item.type}</span></td>
                    <td className="table-td detail">{item.detail}</td>
                    <td className="table-td">
                      {item.isAnomaly ? <span className={`badge-criticity ${item.criticality?.toLowerCase()}`}>{item.criticality?.toUpperCase()}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>}
                    </td>
                    <td className="table-td confidence">{item.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer className="dashboard-footer">
        AI Security Platform - Created by <strong className="text-info">Firas Kerkeni</strong> |
        Hybrid Cloud/On-Premise Architecture
      </footer>
    </div>
  );
};

export default Dashboard;