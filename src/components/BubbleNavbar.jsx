import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Home, Search, Mic2, Library, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'karaoke', label: 'Karaoke', icon: Mic2 },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function BubbleNavbar({ activeTab, onChangeTab, swipeRatio = 0 }) {
  const { settings } = useTheme();
  const trackRef = useRef(null);
  const dragStateRef = useRef({ active: false, moved: false, startX: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));
  const bubbleIdx = useMotionValue(activeIndex);
  const bubbleX = useTransform(bubbleIdx, (v) => `${v * 100}%`);

  // Sinkronkan posisi bubble saat tab berubah atau saat layar digeser
  useEffect(() => {
    if (dragStateRef.current.active) return;
    if (Math.abs(swipeRatio) > 0.02) {
      const preview = Math.max(0, Math.min(TABS.length - 1, activeIndex - swipeRatio * 0.65));
      bubbleIdx.set(preview);
    } else {
      animate(bubbleIdx, activeIndex, {
        type: 'spring',
        stiffness: 440,
        damping: 30,
        mass: 0.7,
      });
    }
  }, [activeIndex, swipeRatio, bubbleIdx]);

  const updateFromClientX = (clientX) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
    const floatIdx = Math.max(0, Math.min(TABS.length - 1, (rel / rect.width) * TABS.length - 0.5));
    bubbleIdx.set(floatIdx);

    const targetIdx = Math.round(floatIdx);
    const targetTab = TABS[targetIdx];
    if (targetTab && targetTab.id !== activeTab) {
      onChangeTab(targetTab.id);
    }
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    dragStateRef.current = { active: true, moved: false, startX: e.clientX };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // abaikan jika tidak didukung
    }
  };

  const handlePointerMove = (e) => {
    if (!dragStateRef.current.active) return;
    e.stopPropagation();
    if (!dragStateRef.current.moved && Math.abs(e.clientX - dragStateRef.current.startX) > 6) {
      dragStateRef.current.moved = true;
      setIsDragging(true);
    }
    if (dragStateRef.current.moved) {
      updateFromClientX(e.clientX);
    }
  };

  const handlePointerEnd = (e) => {
    if (!dragStateRef.current.active) return;
    e.stopPropagation();
    const wasMoved = dragStateRef.current.moved;
    dragStateRef.current.active = false;
    dragStateRef.current.moved = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // abaikan
    }
    if (wasMoved) {
      const snapped = Math.max(0, Math.min(TABS.length - 1, Math.round(bubbleIdx.get())));
      if (TABS[snapped] && TABS[snapped].id !== activeTab) {
        onChangeTab(TABS[snapped].id);
      }
      animate(bubbleIdx, snapped, {
        type: 'spring',
        stiffness: 440,
        damping: 30,
      });
    }
  };

  const stretching = isDragging || Math.abs(swipeRatio) > 0.04;

  return (
    <nav
      aria-label="Navigasi Utama"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
    >
      <div className="bubble-glass gpu-layer pointer-events-auto rounded-full p-1.5 max-w-lg w-full">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          style={{ touchAction: 'none' }}
          className="relative flex items-center w-full select-none cursor-grab active:cursor-grabbing"
        >
          {/* Gelembung iOS Liquid Glass yang Bisa Digeser Langsung */}
          <motion.span
            style={{
              width: `${100 / TABS.length}%`,
              x: bubbleX,
              background: `linear-gradient(135deg, ${settings.accentColor}55, ${settings.accentColor}26)`,
              border: `1px solid ${settings.accentColor}99`,
              boxShadow: `0 6px 24px -4px ${settings.accentColor}aa, inset 0 1.5px 2px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.2)`,
            }}
            animate={{
              scaleX: stretching ? 1.14 : 1,
              scaleY: stretching ? 0.92 : 1,
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="absolute top-0 bottom-0 left-0 rounded-full pointer-events-none gpu-layer"
          />

          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (!dragStateRef.current.moved) onChangeTab(tab.id);
                }}
                className="relative flex-1 py-2 px-1 sm:px-2 rounded-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 z-10 min-w-0"
              >
                <motion.div
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                >
                  <Icon
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{
                      color: isActive ? settings.accentColor : 'var(--text-secondary)',
                    }}
                  />
                </motion.div>

                <span
                  className={`text-[10px] sm:text-xs font-semibold truncate ${
                    isActive ? 'text-main' : 'text-muted'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
