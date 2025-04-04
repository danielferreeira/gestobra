import React from 'react';
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
