import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from "@clerk/react";
import { useTranslation } from '../context/LanguageContext';

const ProtectedRoute = () => {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>{t('loading')}</div>;
  return isSignedIn ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
