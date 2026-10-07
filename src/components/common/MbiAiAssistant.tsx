import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../contexts/SettingsContext';
import { MbiAiChatDrawer } from './MbiAiChatDrawer';

export const MbiAiAssistant: React.FC = () => {
  const { settings } = useSettings();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const dragStartedRef = useRef(false);
  const dragStartTimeRef = useRef(0);

  const [isVisible, setIsVisible] = useState(() => {
    const stored = localStorage.getItem('mbi_show_ai_floating_icon');
    if (stored !== null) return stored === 'true';
    return settings.general.showAiFloatingButton ?? true;
  });

  useEffect(() => {
    const syncVisibility = () => {
      const stored = localStorage.getItem('mbi_show_ai_floating_icon');
      if (stored !== null) {
        setIsVisible(stored === 'true');
      } else {
        setIsVisible(settings.general.showAiFloatingButton ?? true);
      }
    };

    window.addEventListener('mbi-ai-settings-changed', syncVisibility);
    window.addEventListener('mbi_settings_updated', syncVisibility);
    window.addEventListener('storage', syncVisibility);
    return () => {
      window.removeEventListener('mbi-ai-settings-changed', syncVisibility);
      window.removeEventListener('mbi_settings_updated', syncVisibility);
      window.removeEventListener('storage', syncVisibility);
    };
  }, [settings.general.showAiFloatingButton]);

  const handlePointerDown = () => {
    dragStartedRef.current = false;
    dragStartTimeRef.current = Date.now();
  };

  const handleDragStart = () => {
    dragStartedRef.current = true;
  };

  const handleClick = () => {
    const duration = Date.now() - dragStartTimeRef.current;
    if (!dragStartedRef.current || duration < 200) {
      setIsDrawerOpen(true);
    }
  };

  if (!isVisible || settings.general.showAiFloatingButton === false) {
    return null;
  }

  return (
    <>
      {/* Draggable Floating Round 'MBI INVENTRA' AI Emblem Button (Positioned at bottom-left) */}
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={{ left: -20, right: 600, top: -600, bottom: 20 }}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onClick={handleClick}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 left-6 z-50 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        title="MBI AI Assistant & Guide (Click to open)"
      >
        <div className="relative group flex items-center justify-center">
          {/* Ambient Glow Halo */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 rounded-full blur-lg opacity-60 group-hover:opacity-90 transition duration-300 animate-pulse pointer-events-none" />

          {/* Pure White Circular Emblem Badge */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-slate-900 p-1 shadow-2xl shadow-blue-500/30 dark:shadow-blue-500/20 border-2 border-white/90 dark:border-slate-700/80 flex items-center justify-center transition-transform">
            
            {/* Circular Vector Emblem */}
            <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
              <defs>
                <linearGradient id="mbiAiLogoRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d2ff" />
                  <stop offset="50%" stopColor="#0066ff" />
                  <stop offset="100%" stopColor="#002b80" />
                </linearGradient>
                <linearGradient id="inventraTextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0047cc" />
                  <stop offset="50%" stopColor="#0066ff" />
                  <stop offset="100%" stopColor="#00d2ff" />
                </linearGradient>
              </defs>

              {/* Blue / Cyan Outer Circular Border Ring */}
              <circle cx="50" cy="50" r="46.5" stroke="url(#mbiAiLogoRingGrad)" strokeWidth="3.2" fill="none" />

              {/* MBI Bold Lettering */}
              <text 
                x="50" 
                y="48" 
                textAnchor="middle" 
                fontWeight="900" 
                fontSize="24" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fill="#0f172a" 
                className="dark:fill-white"
                letterSpacing="-0.5"
              >
                MBI
              </text>

              {/* INVENTRA Gradient Brand */}
              <text 
                x="50" 
                y="63" 
                textAnchor="middle" 
                fontWeight="900" 
                fontSize="10" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fill="url(#inventraTextGrad)" 
                letterSpacing="0.8"
              >
                INVENTRA
              </text>

              {/* Subtitle Separator Lines & Subtext */}
              <line x1="16" y1="67.5" x2="25" y2="67.5" stroke="#94a3b8" strokeWidth="0.8" strokeLinecap="round" />
              <text 
                x="50" 
                y="70.5" 
                textAnchor="middle" 
                fontWeight="800" 
                fontSize="4" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fill="#334155" 
                className="dark:fill-slate-300"
                letterSpacing="-0.1"
              >
                PHARMACY &amp; INVENTORY
              </text>
              <line x1="75" y1="67.5" x2="84" y2="67.5" stroke="#94a3b8" strokeWidth="0.8" strokeLinecap="round" />

              <text 
                x="50" 
                y="75.5" 
                textAnchor="middle" 
                fontWeight="800" 
                fontSize="3.8" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fill="#64748b" 
                className="dark:fill-slate-400"
                letterSpacing="0.3"
              >
                MANAGEMENT
              </text>
            </svg>

            {/* Active Status Pulse Indicator */}
            <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-xs" />
            <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75 pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* AI Chat Drawer Component */}
      <MbiAiChatDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
};

export const MbiAiWidget = MbiAiAssistant;
export default MbiAiAssistant;
