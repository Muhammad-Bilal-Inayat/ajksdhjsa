import React, { createContext, useContext, useState, useEffect } from 'react';

interface GlobalSearchContextType {
  isOpen: boolean;
  openSearch: (initialQuery?: string, initialCategory?: string) => void;
  closeSearch: () => void;
  toggleSearch: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export const GlobalSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = () => {
    setIsOpen(true);
  };

  const closeSearch = () => {
    setIsOpen(false);
  };

  const toggleSearch = () => {
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <GlobalSearchContext.Provider value={{ isOpen, openSearch, closeSearch, toggleSearch }}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

export const useGlobalSearch = (): GlobalSearchContextType => {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    return {
      isOpen: false,
      openSearch: () => {},
      closeSearch: () => {},
      toggleSearch: () => {}
    };
  }
  return context;
};

export default GlobalSearchContext;
