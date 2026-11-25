import React, { useMemo } from 'react';
import { useTheme, BASE_THEMES } from '../context/ThemeContext';

export default function BackgroundCanvas() {
  const { settings, customBgUrl } = useTheme();
  const base = BASE_THEMES[settings.baseTheme] || BASE_THEMES.midnight;

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: `${(i * 19 + 7) % 96}%`,
        top: `${(i * 29 + 11) % 92}%`,
        size: 6 + (i % 5) * 4,
        delay: `${(i % 6) * 0.8}s`,
        duration: `${10 + (i % 7) * 3}s`,
      })),
    []
  );

  const bgGradient = settings.useCustomGradient
    ? `linear-gradient(135deg, ${settings.customGradientStart}, ${settings.customGradientEnd})`
    : base.gradient;

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none transition-colors duration-700"
      style={{ background: bgGradient }}
    >
      {customBgUrl && settings.customBgMeta?.type === 'video' && (
        <video
          key={customBgUrl}
          src={customBgUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {customBgUrl && settings.customBgMeta?.type === 'image' && (
        <img
          src={customBgUrl}
          alt="Custom Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {customBgUrl && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ backgroundColor: `rgba(5, 5, 10, ${settings.customBgDim / 100})` }}
        />
      )}

      {settings.bgEffect === 'orbs' && (
        <>
          <div
            className="animate-orb-float-1 absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-[110px] opacity-40"
            style={{ background: settings.accentColor }}
          />
          <div
            className="animate-orb-float-2 absolute top-1/3 -right-28 w-[380px] h-[380px] rounded-full blur-[120px] opacity-30"
            style={{ background: '#6366f1' }}
          />
          <div
            className="animate-orb-float-3 absolute -bottom-28 left-1/3 w-[360px] h-[360px] rounded-full blur-[115px] opacity-25"
            style={{ background: '#ec4899' }}
          />
        </>
      )}

      {settings.bgEffect === 'aurora' && (
        <div
          className="animate-aurora-shift absolute -inset-x-20 -top-24 h-[65vh] opacity-35 blur-[95px]"
          style={{
            background: `linear-gradient(90deg, ${settings.accentColor}, #8b5cf6, #06b6d4)`,
          }}
        />
      )}

      {settings.bgEffect === 'particles' && (
        <div className="absolute inset-0">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-full blur-[1px] opacity-35 animate-pulse"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.id % 2 === 0 ? settings.accentColor : '#a855f7',
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
