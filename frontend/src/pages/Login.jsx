import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('username', response.data.username);
        
        // Petit délai pour l'effet visuel
        setTimeout(() => {
          navigate('/');
        }, 800);
      } else {
        setError(response.data.error || 'Échec de l\'authentification');
      }
    } catch (err) {
      setError('Impossible de contacter le serveur SOC.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Arrière-plan animé (Grille Cyber) */}
      <div className="cyber-grid"></div>
      <div className="cyber-overlay"></div>

      {/* Carte de Connexion */}
      <div className="login-card">
        <div className="login-header">
          <div className="logo-shield">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <rect x="9" y="9" width="6" height="6" rx="1"></rect>
            </svg>
          </div>
          <h1>Plateforme Sécurité IA</h1>
          <p>Accès Sécurisé au SOC - Phase 3</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Identifiant Analyste</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input 
                id="username"
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="ex: admin" 
                required 
                autoComplete="off"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input 
                id="password"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
              />
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <span>Authentification</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Démonstration :</p>
          <div className="demo-credentials">
            <span>👤 Admin: <code>admin / admin123</code></span>
            <span>👤 Analyste: <code>analyste_test / user123</code></span>
          </div>
        </div>
        
        {/* Élément décoratif "Système Sécurisé" */}
        <div className="secure-badge">
          <span className="blink">●</span> Système Chiffré & Authentifié
        </div>
      </div>

      {/* Styles CSS intégrés pour garantir le design */}
            {/* Styles CSS intégrés pour garantir le design et le centrage */}
      <style>{`
        .login-container {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;       /* Centre verticalement */
          justify-content: center;   /* Centre horizontalement */
          font-family: 'Segoe UI', sans-serif;
          overflow: hidden;
          background: #0f172a;
          width: 100%;
          margin: 0;
          padding: 0;
        }

        /* Fond Grille Cyber */
        .cyber-grid {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: 
            linear-gradient(rgba(0, 210, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 210, 255, 0.08) 1px, transparent 1px);
          background-size: 50px 50px;
          transform: perspective(600px) rotateX(60deg);
          animation: gridMove 30s linear infinite;
          z-index: 0;
          pointer-events: none;
        }

        @keyframes gridMove {
          0% { transform: perspective(600px) rotateX(60deg) translateY(0); }
          100% { transform: perspective(600px) rotateX(60deg) translateY(50px); }
        }

        .cyber-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(15, 23, 42, 0.4) 0%, #0f172a 80%);
          z-index: 1;
          pointer-events: none;
        }

        /* Carte Glassmorphism */
        .login-card {
          position: relative;
          z-index: 10;
          background: rgba(30, 41, 59, 0.65);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px); /* Pour Safari/Edge */
          border: 1px solid rgba(0, 210, 255, 0.15);
          border-radius: 24px;
          padding: 45px 40px;
          width: 90%;
          max-width: 440px;
          box-shadow: 
            0 20px 50px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
            0 0 30px rgba(0, 210, 255, 0.1);
          animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
          margin: auto; /* Sécurité supplémentaire */
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .logo-shield {
          width: 70px;
          height: 70px;
          margin: 0 auto 20px;
          background: radial-gradient(circle, rgba(0, 210, 255, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(0, 210, 255, 0.3);
          box-shadow: 0 0 25px rgba(0, 210, 255, 0.2), inset 0 0 15px rgba(0, 210, 255, 0.1);
          animation: pulseGlow 3s ease-in-out infinite;
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 25px rgba(0, 210, 255, 0.2); }
          50% { box-shadow: 0 0 40px rgba(0, 210, 255, 0.4); }
        }

        .logo-shield svg {
          width: 35px;
          height: 35px;
          color: #00d2ff;
          filter: drop-shadow(0 0 5px #00d2ff);
        }

        .login-header h1 {
          color: #fff;
          font-size: 1.9rem;
          margin: 0;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
        }

        .login-header p {
          color: #94a3b8;
          font-size: 0.95rem;
          margin-top: 8px;
          font-weight: 400;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .input-group label {
          display: block;
          color: #cbd5e1;
          font-size: 0.9rem;
          margin-bottom: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          width: 20px;
          height: 20px;
          color: #64748b;
          transition: all 0.3s ease;
          z-index: 2;
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 14px 14px 45px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid #334155;
          border-radius: 12px;
          color: #fff;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
          box-sizing: border-box; /* Important pour le padding */
        }

        .input-wrapper input:focus {
          border-color: #00d2ff;
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 0 0 3px rgba(0, 210, 255, 0.15), 0 0 15px rgba(0, 210, 255, 0.2);
        }

        .input-wrapper input:focus ~ .input-icon,
        .input-wrapper:focus-within .input-icon {
          color: #00d2ff;
          transform: scale(1.1);
        }

        .error-message {
          background: rgba(255, 71, 87, 0.15);
          border: 1px solid rgba(255, 71, 87, 0.4);
          color: #ff6b6b;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.9rem;
          text-align: center;
          font-weight: 500;
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          box-shadow: 0 4px 12px rgba(255, 71, 87, 0.1);
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .login-btn {
          background: linear-gradient(135deg, #00d2ff 0%, #007bff 100%);
          color: white;
          border: none;
          padding: 15px;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);
          position: relative;
          overflow: hidden;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-size: 0.95rem;
        }

        .login-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: 0.5s;
        }

        .login-btn:hover::before {
          left: 100%;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 210, 255, 0.5);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .login-btn svg {
          width: 20px;
          height: 20px;
          transition: transform 0.3s;
        }

        .login-btn:hover svg {
          transform: translateX(4px);
        }

        .login-btn.loading {
          background: #475569;
          cursor: not-allowed;
          box-shadow: none;
        }

        .spinner {
          width: 22px;
          height: 22px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          margin-top: 30px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 25px;
        }

        .login-footer p {
          color: #64748b;
          font-size: 0.85rem;
          margin-bottom: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.75rem;
        }

        .demo-credentials {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.85rem;
          color: #94a3b8;
          align-items: center;
        }

        .demo-credentials span {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .demo-credentials code {
          background: rgba(0, 210, 255, 0.1);
          color: #00d2ff;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 0.85rem;
          border: 1px solid rgba(0, 210, 255, 0.2);
        }

        .secure-badge {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          color: #2ed573;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0.7;
          background: rgba(46, 213, 115, 0.1);
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid rgba(46, 213, 115, 0.2);
          white-space: nowrap;
        }

        .blink {
          animation: blinker 1.5s linear infinite;
          color: #2ed573;
          font-weight: bold;
        }

        @keyframes blinker { 50% { opacity: 0; } }
        
        /* Responsive Mobile */
        @media (max-width: 480px) {
          .login-card {
            width: 95%;
            padding: 30px 20px;
          }
          .login-header h1 {
            font-size: 1.6rem;
          }
        }
      `}</style>
      </div>
  );
};

export default Login;