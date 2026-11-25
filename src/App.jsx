import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AudioProvider } from './context/AudioContext';
import BackgroundCanvas from './components/BackgroundCanvas';
import Header from './components/Header';
import BubbleNavbar from './components/BubbleNavbar';
import MiniPlayer from './components/MiniPlayer';
import FullPlayerWithLyrics from './components/FullPlayerWithLyrics';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import Settings from './pages/Settings';

const TAB_ORDER = ['home', 'search', 'library', 'settings'];

function MainShell() {
  const { settings } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [direction, setDirection] = useState(1);

  const touchStartRef = useRef({ x: 0, y: 0, blocked: false });

  const switchTab = (nextTab) => {
    if (nextTab === activeTab) return;
    const prevIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx = TAB_ORDER.indexOf(nextTab);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    setActiveTab(nextTab);
  };

  const handleTouchStart = (e) => {
    const blocked = Boolean(e.target.closest('[data-no-tab-swipe], input[type="range"]'));
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      blocked,
    };
  };

  const handleTouchEnd = (e) => {
    if (touchStartRef.current.blocked) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const idx = TAB_ORDER.indexOf(activeTab);
      if (dx < 0 && idx < TAB_ORDER.length - 1) {
        switchTab(TAB_ORDER[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        switchTab(TAB_ORDER[idx - 1]);
      }
    }
  };

  const getPageVariants = () => {
    switch (settings.pageTransition) {
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.94 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.96 },
        };
      case 'drift':
        return {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -14 },
        };
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      case 'liquid':
      default:
        return {
          initial: { opacity: 0, x: direction * 36 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: direction * -36 },
        };
    }
  };

  const variants = getPageVariants();

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen w-full relative flex flex-col"
    >
      <BackgroundCanvas />
      <Header onOpenSettings={() => switchTab('settings')} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-2 pb-44">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {activeTab === 'home' && <Home />}
            {activeTab === 'search' && <Search />}
            {activeTab === 'library' && <Library />}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      <MiniPlayer />
      <BubbleNavbar activeTab={activeTab} onChangeTab={switchTab} />
      <FullPlayerWithLyrics />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <MainShell />
      </AudioProvider>
    </ThemeProvider>
  );
}
