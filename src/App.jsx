import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Obras from './pages/Obras';
import DetalheObra from './pages/DetalheObra';
import NovaObra from './pages/NovaObra';
import Fornecedores from './pages/Fornecedores';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // Carregar tema do localStorage ao iniciar a aplicação
  useEffect(() => {
    // Aplicar tema (claro/escuro)
    const tema = localStorage.getItem('tema') || 'claro';
    const corPrimaria = localStorage.getItem('corPrimaria') || '#3B82F6';
    const tamanhoFonte = localStorage.getItem('tamanhoFonte') || 'medio';
    
    const root = document.documentElement;
    
    // Aplicar tema
    if (tema === 'escuro') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937';
      document.body.style.color = '#f9fafb';
    } else if (tema === 'claro') {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#1f2937';
    } else if (tema === 'sistema') {
      // Detectar preferência do sistema
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDarkMode) {
        root.classList.add('dark');
        document.body.style.backgroundColor = '#1f2937';
        document.body.style.color = '#f9fafb';
      } else {
        root.classList.remove('dark');
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#1f2937';
      }
    }
    
    // Aplicar cor primária
    root.style.setProperty('--color-primary', corPrimaria);
    
    // Aplicar tamanho da fonte
    const fontSizeMap = {
      pequeno: '0.875rem',
      medio: '1rem',
      grande: '1.125rem'
    };
    
    root.style.fontSize = fontSizeMap[tamanhoFonte] || '1rem';
  }, []);

  useEffect(() => {
    // Aplicar tema escuro ou claro
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Aplicar cor primária personalizada
    const corPrimaria = localStorage.getItem('corPrimaria');
    if (corPrimaria) {
      document.documentElement.style.setProperty('--color-primary', corPrimaria);
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />
          
          <Route
            path="/login"
            element={<Login />}
          />
          
          <Route 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/obras" element={<Obras />} />
            <Route path="/obras/nova" element={<NovaObra />} />
            <Route path="/obras/:id" element={<DetalheObra />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
