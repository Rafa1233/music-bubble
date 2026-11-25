import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Library, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function BubbleNavbar({ activeTab, onChangeTab }) {
  const { settings, isLightMode } = useTheme();

  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
    >
      <div className="bubble-glass pointer-events-auto rounded-full p-1.5 flex items-center gap-1 max-w-md w-full justify-between">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              whileTap={{ scale: 1.08 }}
              className="relative flex-1 py-2 px-3 rounded-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors z-10"
            >
              {isActive && (
                <motion.span
                  layoutId="liquid-bubble-pill"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className="absolute inset-0 rounded-full -z-10"
                  style={{
                    background: `linear-gradient(135deg, ${settings.accentColor}44, ${settings.accentColor}22)`,
                    border: `1px solid ${settings.accentColor}77`,
                    boxShadow: `0 0 20px -4px ${settings.accentColor}88, inset 0 1px 1px rgba(255,255,255,0.35)`,
                  }}
                />
              )}

              <motion.div
                animate={{ scale: isActive ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 24 }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{
                    color: isActive
                      ? settings.accentColor
                      : isLightMode
                      ? 'rgba(15,23,42,0.72)'
                      : 'rgba(255,255,255,0.75)',
                  }}
                />
              </motion.div>

              <span
                className={`text-[11px] sm:text-xs font-semibold ${
                  isActive
                    ? isLightMode
                      ? 'text-slate-900'
                      : 'text-white'
                    : isLightMode
                    ? 'text-slate-700/80'
                    : 'text-white/70'
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
