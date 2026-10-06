import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { MbiAiChatDrawer } from './MbiAiChatDrawer';

export const MbiAiAssistant: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const dragStartedRef = useRef(false);
  const dragStartTimeRef = useRef(0);

  const handlePointerDown = () => {
    dragStartedRef.current = false;
    dragStartTimeRef.current = Date.now();
  };

  const handleDragStart = () => {
    dragStartedRef.current = true;
  };

  const handleClick = (e: React.MouseEvent) => {
    const duration = Date.now() - dragStartTimeRef.current;
    if (!dragStartedRef.current || duration < 200) {
      setIsDrawerOpen(true);
    }
  };

  return (
    <>
      {/* Draggable Floating 'MBI AI Guide' Button (Positioned at bottom-left) */}
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
      >
        <div className="relative group">
          {/* Ambient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 rounded-full blur-md opacity-80 dark:opacity-100 group-hover:opacity-100 transition duration-300 animate-pulse pointer-events-none" />

          {/* Badge Container */}
          <div className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-600 dark:via-cyan-600 dark:to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl border border-white/30 dark:border-cyan-400/60 backdrop-blur-md transition-all">
            <div className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-white/40">
              <img 
                src="/mbi-favicon.png" 
                alt="MBI" 
                className="w-full h-full object-contain" 
                onError={(e) => { (e.target as HTMLImageElement).src = '/mbi-favicon.svg'; }} 
              />
            </div>
            <span className="tracking-wide font-black text-white drop-shadow-xs">MBI AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
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
