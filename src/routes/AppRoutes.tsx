import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from '../pages/AuthPage';

const CheckoutPage = lazy(() => import('../pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const LandingPage = lazy(() => import('../pages/Home').then(m => ({ default: m.Home })));

/**
 * AppRoutes provides modular export for standardized routing
 */
export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200">
        <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/login" element={<AuthPage initialMode="login" />} />
        <Route path="/register" element={<AuthPage initialMode="register" />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/workspace" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

