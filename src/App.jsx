import React, { useRef, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import BackgroundCanvas from './components/BackgroundCanvas';
import Header from './components/Header';
import BubbleNavbar from './components/BubbleNavbar';
import MiniPlayer from './components/MiniPlayer';
import FullPlayerWithLyrics from './components/FullPlayerWithLyrics';
import Home from './pages/Home';
import Search from './pages/Search';
import KaraokeStudio from './pages/KaraokeStudio';
import Library from './pages/Library';
import Settings from './pages/Settings';
import ArtistDetail from './pages/ArtistDetail';
import AlbumDetail from './pages/AlbumDetail';

const TAB_ORDER = ['home', 'search', 'karaoke', 'library', 'settings'];

function MainShell() {
  const { settings } = useTheme();
  const { detailRoute, closeDetail } = useAudio();
  const [activeTab, setActiveTab] = useState('home');
  const [swipeRatio, setSwipeRatio] = useState(0);

  const pageX = useMotionValue(0);
  const touchStartRef = useRef({ x: 0, y: 0, blocked: false, horizontal: false });

  const switchTab = (nextTab, dirHint = 0) => {
    if (detailRoute) closeDetail();
    if (nextTab === activeTab) return;
    const prevIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx = TAB_ORDER.indexOf(nextTab);
    const dir = dirHint || (nextIdx >= prevIdx ? 1 : -1);

    setActiveTab(nextTab);
    pageX.set(dir * 36);
    animate(pageX, 0, {
      type: 'spring',
      stiffness: 420,
      damping: 32,
      mass: 0.75,
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleTouchStart = (e) => {
    if (detailRoute) return;
    const blocked = Boolean(e.target.closest('[data-no-tab-swipe], input[type="range"]'));
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      blocked,
      horizontal: false,
    };
  };

  const handleTouchMove = (e) => {
    if (detailRoute || touchStartRef.current.blocked) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    if (!touchStartRef.current.horizontal) {
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        touchStartRef.current.horizontal = true;
      } else {
        return;
      }
    }

    const idx = TAB_ORDER.indexOf(activeTab);
    const atLeftEdge = idx === 0 && dx > 0;
    const atRightEdge = idx === TAB_ORDER.length - 1 && dx < 0;
    const resisted = atLeftEdge || atRightEdge ? dx * 0.25 : dx * 0.65;

    pageX.set(resisted);
    setSwipeRatio(Math.max(-1, Math.min(1, dx / 180)));
  };

  const handleTouchEnd = (e) => {
    setSwipeRatio(0);
    if (detailRoute || touchStartRef.current.blocked) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      const idx = TAB_ORDER.indexOf(activeTab);
      if (dx < 0 && idx < TAB_ORDER.length - 1) {
        switchTab(TAB_ORDER[idx + 1], 1);
        return;
      }
      if (dx > 0 && idx > 0) {
        switchTab(TAB_ORDER[idx - 1], -1);
        return;
      }
    }

    animate(pageX, 0, { type: 'spring', stiffness: 420, damping: 30 });
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen w-full relative flex flex-col"
    >
      <BackgroundCanvas />
      <Header onOpenSettings={() => switchTab('settings')} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-2 pb-56 overflow-x-clip">
        {detailRoute ? (
          detailRoute.type === 'artist' ? (
            <ArtistDetail
              artistId={detailRoute.id}
              fallbackName={detailRoute.fallbackName}
              fallbackCover={detailRoute.fallbackCover}
              onBack={closeDetail}
            />
          ) : (
            <AlbumDetail
              albumId={detailRoute.id}
              fallbackName={detailRoute.fallbackName}
              fallbackCover={detailRoute.fallbackCover}
              onBack={closeDetail}
            />
          )
        ) : (
          <motion.div
            key={activeTab}
            style={settings.pageTransition === 'liquid' ? { x: pageX } : undefined}
            initial={{ opacity: 0.72, scale: settings.pageTransition === 'scale' ? 0.96 : 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="gpu-layer"
          >
            {activeTab === 'home' && <Home />}
            {activeTab === 'search' && <Search />}
            {activeTab === 'karaoke' && <KaraokeStudio />}
            {activeTab === 'library' && <Library />}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        )}
      </main>

      <MiniPlayer />
      <BubbleNavbar
        activeTab={activeTab}
        onChangeTab={switchTab}
        swipeRatio={swipeRatio}
      />
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
