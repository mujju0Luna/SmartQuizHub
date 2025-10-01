import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import StudentDashboard from './components/student/StudentDashboard';
import FacultyDashboard from './components/faculty/FacultyDashboard';

const AppRoutes: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!currentUser ? <LoginPage /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/" 
        element={
          currentUser && userProfile ? (
            userProfile.role === 'student' ? 
              <StudentDashboard /> : 
              <FacultyDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;