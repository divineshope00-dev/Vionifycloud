/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { LanguageProvider } from './contexts/LanguageContext';
import { db } from './services/supabaseService';
import LandingPage from './pages/LandingPage';
import RoleSelection from './pages/RoleSelection';
import Signup from './pages/Signup';
import Login from './pages/Login';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import Publish from './pages/Publish';
import Premium from './pages/Premium';
import Club from './pages/Club';
import Profile from './pages/Profile';
import EntrepriseProfile from './pages/EntrepriseProfile';
import VideoDetail from './pages/VideoDetail';
import Search from './pages/Search';
import Statistics from './pages/Statistics';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Notice from './pages/Notice';
import NoticeEntreprise from './pages/NoticeEntreprise';
import ResetPassword from './pages/ResetPassword';
import Contact from './pages/Contact';
import InstallPrompt from './components/InstallPrompt';
import SplashScreen from './components/SplashScreen';
import SubscriptionGuard from './components/SubscriptionGuard';

// Helper component to redirect authenticated users
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const user = db.getCurrentUser();
  if (user && !user.isGuest) {
    return <Navigate to="/app/home" replace />;
  }
  return <>{children}</>;
};

// Helper component for protected routes with subscription check
const ProtectedRoute = ({ children, requireSubscription = false }: { children: React.ReactNode, requireSubscription?: boolean }) => {
  const [user, setUser] = useState(db.getCurrentUser());

  useEffect(() => {
    const handleUserChange = () => {
      setUser(db.getCurrentUser());
    };
    window.addEventListener('user-changed', handleUserChange);
    return () => {
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireSubscription && user.type === 'entreprise') {
    return <SubscriptionGuard user={user}>{children}</SubscriptionGuard>;
  }
  
  return <>{children}</>;
};

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    // Initialize Supabase and Auth listeners
    db.initialize();

    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LanguageProvider>
      <AnimatePresence mode="wait">
        {isSplashVisible && <SplashScreen key="splash" />}
      </AnimatePresence>
      <InstallPrompt />
      <Router>
        <Routes>
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/role-selection" element={<PublicRoute><RoleSelection /></PublicRoute>} />
          <Route path="/signup/:role" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/app/notice" element={<Notice />} />
          <Route path="/app/notice-entreprise" element={<NoticeEntreprise />} />
          
          <Route path="/app" element={<MainLayout />}>
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home" element={<ProtectedRoute requireSubscription><Home /></ProtectedRoute>} />
            <Route path="video/:id" element={<VideoDetail />} />
            <Route path="publish" element={<ProtectedRoute requireSubscription><Publish /></ProtectedRoute>} />
            <Route path="search" element={<Search />} />
            <Route path="statistics" element={<ProtectedRoute requireSubscription><Statistics /></ProtectedRoute>} />
            <Route path="entreprise/:id" element={<EntrepriseProfile />} />
            <Route path="premium" element={<Premium />} />
            <Route path="club" element={<Club />} />
            <Route path="profile" element={<Profile />} />
            <Route path="contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </LanguageProvider>
  );
}
