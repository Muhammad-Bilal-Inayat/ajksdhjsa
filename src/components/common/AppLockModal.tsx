import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, ShieldAlert, KeyRound, ArrowRight, RefreshCw, XCircle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';

export const AppLockModal: React.FC = () => {
  const { settings } = useSettings();
  const { currentUser, activeUser, tenant } = useAuth();

  const isPasscodeEnabled = settings?.general?.enablePasscode === true;
  const configuredPasscode = (
    currentUser?.passcode || 
    activeUser?.passcode || 
    settings?.general?.passcode || 
    '1234'
  ).toString().trim();

  // App is locked if passcode is enabled AND session storage does not have 'true'
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const sessionVal = sessionStorage.getItem('mbi_app_unlocked');
    return sessionVal === 'true';
  });

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state if settings or passcode enabled changes
  useEffect(() => {
    if (!isPasscodeEnabled) {
      setIsUnlocked(true);
      sessionStorage.setItem('mbi_app_unlocked', 'true');
    } else {
      const sessionVal = sessionStorage.getItem('mbi_app_unlocked');
      if (sessionVal !== 'true') {
        setIsUnlocked(false);
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [isPasscodeEnabled]);

  // Handle keypad number input
  const handleDigitPress = (digit: string) => {
    if (enteredPin.length < 6) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setErrorMsg('');
      if (nextPin.length >= 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setEnteredPin('');
    setErrorMsg('');
  };

  const verifyPin = (pinToTest: string) => {
    const trimmed = pinToTest.trim();
    // Accept user passcode, settings passcode, or standard master emergency codes
    const isMasterCode = trimmed === '0000' || trimmed === '7860' || trimmed === '1234';
    const isUserCode = trimmed === configuredPasscode;

    if (isUserCode || isMasterCode) {
      setIsUnlocked(true);
      sessionStorage.setItem('mbi_app_unlocked', 'true');
      setEnteredPin('');
      setErrorMsg('');
    } else {
      setShake(true);
      setErrorMsg('Incorrect Passcode. Please try again.');
      setTimeout(() => {
        setShake(false);
        setEnteredPin('');
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyPin(enteredPin);
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  // If passcode is disabled or user already unlocked this session, render nothing
  if (!isPasscodeEnabled || isUnlocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 select-none animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-7 shadow-2xl text-white text-center flex flex-col items-center relative transition-transform ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Glow Halo */}
        <div className="absolute -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 ring-4 ring-blue-500/20">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-xl font-black tracking-tight text-white mb-1">
          MBI INVENTRA
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-medium">
          Enter your 4-digit security PIN to unlock workspace
        </p>

        {/* Hidden input for physical keyboard focus */}
        <input
          ref={inputRef}
          type="password"
          maxLength={6}
          value={enteredPin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setEnteredPin(val);
            if (val.length >= 4) {
              verifyPin(val);
            }
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          className="opacity-0 absolute -z-10"
        />

        {/* PIN Dots Display */}
        <div 
          onClick={() => inputRef.current?.focus()}
          className="flex items-center justify-center gap-4 mb-6 cursor-pointer"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-blue-500 scale-125 shadow-md shadow-blue-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMsg ? (
          <div className="text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-800/60 rounded-xl px-3 py-1.5 mb-4 flex items-center gap-1.5 animate-pulse">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="h-7 mb-2" />
        )}

        {/* Touch / Click Onscreen Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 active:bg-blue-600 active:scale-95 text-lg font-bold text-white transition-all shadow-sm flex items-center justify-center border border-slate-700/60 cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center border border-slate-800 cursor-pointer"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 active:bg-blue-600 active:scale-95 text-lg font-bold text-white transition-all shadow-sm flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center border border-slate-800 cursor-pointer"
          >
            ⌫
          </button>
        </div>

        {/* Footer Hint */}
        <div className="text-[11px] text-slate-500 font-medium">
          Protected Session • Type or tap PIN to unlock
        </div>
      </div>
    </div>
  );
};
