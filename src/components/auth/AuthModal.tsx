import React, { useState } from 'react';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  if (!isOpen) return null;

  if (mode === 'login') {
    return (
      <LoginModal
        isOpen={isOpen}
        onClose={onClose}
        onSwitchToRegister={() => setMode('register')}
      />
    );
  }

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={onClose}
      onSwitchToLogin={() => setMode('login')}
    />
  );
};

export { LoginModal, RegisterModal };
export default AuthModal;
