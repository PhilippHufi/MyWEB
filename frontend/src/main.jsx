import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardPage } from './pages/DashboardPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { LoginPage } from './pages/LoginPage';
import './styles.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('life:token'));

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  function logout() {
    localStorage.removeItem('life:token');
    setToken(null);
  }

  if (window.location.pathname === '/google/callback') return <GoogleCallbackPage />;
  return token ? <DashboardPage onLogout={logout} /> : <LoginPage onLogin={setToken} />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
