import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Sparkles, LogIn, LogOut, User, X, CheckCircle2 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { isFirebaseConfigured } from '../firebase';

export default function Header({ onOpenSettings }) {
  const { user, loginGoogle, logoutGoogle, likedSongs, playlists } = useAudio();
  const { settings, updateSetting, isLightMode } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [authMsg, setAuthMsg] = useState('');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  const displayName = user?.displayName || 'Mode Tamu';
  const avatarUrl = user?.photoURL || null;

  const handleGoogleLogin = async () => {
    setAuthMsg('');
    try {
      await loginGoogle();
      setProfileOpen(false);
    } catch (err) {
      setAuthMsg(err?.message || 'Login Google tidak tersedia.');
    }
  };

  const renderAvatarFrame = () => {
    const anim = settings.profileAnimation;
    return (
      <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
        {anim === 'aurora' && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
            className="absolute -inset-[2.5px] rounded-full"
            style={{
              background: `conic-gradient(from 0deg, ${settings.accentColor}, #8b5cf6, #ec4899, ${settings.accentColor})`,
            }}
          />
        )}
        {anim === 'pulse' && (
          <span
            className="absolute inset-0 rounded-full profile-ring-pulse"
            style={{ border: `2px solid ${settings.accentColor}` }}
          />
        )}
        {anim === 'orbit' && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
            className="absolute -inset-1 rounded-full border border-dashed"
            style={{ borderColor: settings.accentColor }}
          >
            <span
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: settings.accentColor }}
            />
          </motion.span>
        )}

        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border border-white/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-white/90" />
          )}
        </div>
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950"
          style={{ backgroundColor: settings.accentColor }}
        />
      </div>
    );
  };

  return (
    <>
      <header className="w-full max-w-6xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-medium tracking-wide uppercase opacity-70 ${isLightMode ? 'text-slate-700' : 'text-white'}`}>
            AuraSound Player
          </p>
          <h1 className={`text-2xl md:text-3xl font-heading font-extrabold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            {greeting}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Buka Pengaturan"
            className="glass-card w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <SettingsIcon className={`w-5 h-5 ${isLightMode ? 'text-slate-800' : 'text-white'}`} />
          </button>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="glass-card pl-1.5 pr-3 py-1 rounded-full flex items-center gap-2.5 hover:scale-[1.03] active:scale-95 transition-transform"
          >
            {renderAvatarFrame()}
            <div className="hidden sm:flex flex-col items-start text-left max-w-[120px]">
              <span className={`text-xs font-semibold truncate w-full ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                {displayName}
              </span>
              <span className="text-[10px] opacity-65">
                {user ? 'Tersinkron' : 'Lokal Aktif'}
              </span>
            </div>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setProfileOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bubble-glass w-full max-w-sm rounded-3xl p-6 relative text-white bg-zinc-900/80"
            >
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="scale-150 mb-5">{renderAvatarFrame()}</div>
                <h2 className="text-lg font-heading font-bold">{displayName}</h2>
                <p className="text-xs opacity-70 mt-0.5">
                  {user?.email || 'Semua favorit & playlist tersimpan otomatis di perangkat.'}
                </p>

                <div className="grid grid-cols-2 gap-3 w-full my-5">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xl font-heading font-bold" style={{ color: settings.accentColor }}>
                      {likedSongs.length}
                    </p>
                    <p className="text-xs opacity-70">Lagu Disukai</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xl font-heading font-bold" style={{ color: settings.accentColor }}>
                      {playlists.length}
                    </p>
                    <p className="text-xs opacity-70">Playlist</p>
                  </div>
                </div>

                <div className="w-full text-left mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Animasi Bingkai Profil
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'aurora', label: 'Aurora' },
                      { id: 'pulse', label: 'Pulse' },
                      { id: 'orbit', label: 'Orbit' },
                      { id: 'clean', label: 'Polos' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSetting('profileAnimation', opt.id)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition ${
                          settings.profileAnimation === opt.id
                            ? 'bg-white/20 border-white/50 text-white'
                            : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {authMsg && <p className="text-xs text-amber-300 mb-3">{authMsg}</p>}

                {user ? (
                  <button
                    type="button"
                    onClick={logoutGoogle}
                    className="w-full py-2.5 rounded-2xl bg-rose-500/20 border border-rose-400/30 text-rose-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-500/30"
                  >
                    <LogOut className="w-4 h-4" /> Keluar Akun Google
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-2.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-zinc-950 transition hover:brightness-110"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    {isFirebaseConfigured ? (
                      <>
                        <LogIn className="w-4 h-4" /> Masuk dengan Google
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Mode Tamu Aktif (Siap Pakai)
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
