import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Mic2, Library, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'karaoke', label: 'Karaoke', icon: Mic2 },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function BubbleNavbar({ activeTab, onChangeTab, swipeProgress = 0 }) {
  const { settings } = useTheme();
  const isSwiping = Math.abs(swipeProgress) > 0.03;

  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
    >
      <div className="bubble-glass gpu-layer pointer-events-auto rounded-full p-1.5 flex items-center gap-0.5 max-w-lg w-full justify-between relative overflow-hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              whileTap={{ scale: 1.06 }}
              className="relative flex-1 py-2 px-1.5 sm:px-3 rounded-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-colors z-10 min-w-0"
            >
              {isActive && (
                <motion.span
                  layoutId="ios-liquid-bubble"
                  animate={{
                    scaleX: isSwiping ? 1.18 : 1,
                    scaleY: isSwiping ? 0.92 : 1,
                    x: swipeProgress * -24,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.75 }}
                  className="absolute inset-0 rounded-full -z-10 gpu-layer"
                  style={{
                    background: `linear-gradient(135deg, ${settings.accentColor}4d, ${settings.accentColor}24)`,
                    border: `1px solid ${settings.accentColor}88`,
                    boxShadow: `0 6px 24px -4px ${settings.accentColor}99, inset 0 1.5px 2px rgba(255,255,255,0.55), inset 0 -1px 2px rgba(0,0,0,0.2)`,
                  }}
                />
              )}

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
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
