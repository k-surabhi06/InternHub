import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BrowsePage from './pages/BrowsePage';
import InternshipDetailPage from './pages/InternshipDetailPage';
import TrackerPage from './pages/TrackerPage';
import ProfilePage from './pages/ProfilePage';
import SavedSearchesPage from './pages/SavedSearchesPage';
import ResumesPage from './pages/ResumesPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/internships/:id" element={<InternshipDetailPage />} />
              <Route
                path="/tracker"
                element={<ProtectedRoute><TrackerPage /></ProtectedRoute>}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
              />
              <Route
                path="/saved-searches"
                element={<ProtectedRoute><SavedSearchesPage /></ProtectedRoute>}
              />
              <Route
                path="/resumes"
                element={<ProtectedRoute><ResumesPage /></ProtectedRoute>}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
