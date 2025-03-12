import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Obras from './pages/Obras';
import DetalheObra from './pages/DetalheObra';
import NovaObra from './pages/NovaObra';
import Fornecedores from './pages/Fornecedores';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={<Login />}
          />
          
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/obras" element={<Obras />} />
            <Route path="/obras/nova" element={<NovaObra />} />
            <Route path="/obras/:id" element={<DetalheObra />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
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
