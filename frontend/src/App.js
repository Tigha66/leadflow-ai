import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Conversations from './pages/Conversations';
import Appointments from './pages/Appointments';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import './styles/App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

// Main App Component
function AppContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {currentUser && <Sidebar />}
      
      <div className={`flex-1 flex flex-col overflow-hidden ${currentUser ? 'md:ml-64' : ''}`}>
        {currentUser && <Header />}
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={currentUser ? <Navigate to="/dashboard" /> : <Register />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leads" 
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/conversations" 
              element={
                <ProtectedRoute>
                  <Conversations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/appointments" 
              element={
                <ProtectedRoute>
                  <Appointments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
