import React, { useState } from 'react';
import { Heart, ListMusic, Plus, Trash2, Play, HardDrive } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

export default function Library() {
  const {
    likedSongs,
    playlists,
    localTracks,
    createPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    removeLocalTrack,
    playTrack,
  } = useAudio();
  const { settings, isLightMode } = useTheme();

  const [tab, setTab] = useState('liked');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = createPlaylist(newName, newDesc);
    setNewName('');
    setNewDesc('');
    if (created) setSelectedPlaylistId(created.id);
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="flex gap-2">
        {[
          { id: 'liked', label: `Disukai (${likedSongs.length})`, icon: Heart },
          { id: 'playlists', label: `Playlist (${playlists.length})`, icon: ListMusic },
          { id: 'local', label: `Lokal (${localTracks.length})`, icon: HardDrive },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSelectedPlaylistId(null);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition ${
                active ? 'text-zinc-950' : 'glass-card opacity-80'
              }`}
              style={active ? { backgroundColor: settings.accentColor } : undefined}
            >
              <Icon className="w-3.5 h-3.5" /> {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'liked' && (
        <div className="space-y-2.5">
          {likedSongs.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center opacity-75">
              <Heart className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Belum ada lagu yang disukai. Tekan ikon hati pada lagu favoritmu!</p>
            </div>
          ) : (
            likedSongs.map((track, idx) => (
              <SongCard key={track.id} track={track} queueList={likedSongs} layout="row" index={idx} />
            ))
          )}
        </div>
      )}

      {tab === 'playlists' && (
        <div className="space-y-5">
          {!activePlaylist ? (
            <>
              <form onSubmit={handleCreatePlaylist} className="glass-card rounded-3xl p-4 space-y-3">
                <p className={`text-sm font-heading font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  Buat Playlist Baru
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama playlist (misal: Malam Galau)"
                    className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm outline-none"
                  />
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Deskripsi singkat (opsional)"
                    className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 inline-flex items-center gap-1.5"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <Plus className="w-4 h-4" /> Buat Playlist
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => setSelectedPlaylistId(pl.id)}
                    className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:scale-[1.01] transition"
                  >
                    <div className="min-w-0">
                      <p className="font-heading font-bold truncate">{pl.name}</p>
                      <p className="text-xs opacity-70 truncate">
                        {pl.description || `${pl.tracks.length} lagu tersimpan`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {pl.tracks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => playTrack(pl.tracks[0], pl.tracks)}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950"
                          style={{ backgroundColor: settings.accentColor }}
                        >
                          <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deletePlaylist(pl.id)}
                        className="p-2 rounded-full hover:bg-rose-500/20 text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedPlaylistId(null)}
                  className="text-xs font-semibold underline opacity-80"
                >
                  ← Kembali ke Semua Playlist
                </button>
                {activePlaylist.tracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => playTrack(activePlaylist.tracks[0], activePlaylist.tracks)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold text-zinc-950 flex items-center gap-1.5"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-950" /> Putar Semua
                  </button>
                )}
              </div>

              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-lg font-heading font-bold">{activePlaylist.name}</h3>
                {activePlaylist.description && (
                  <p className="text-xs opacity-70">{activePlaylist.description}</p>
                )}
              </div>

              {activePlaylist.tracks.length === 0 ? (
                <p className="text-sm opacity-70 text-center py-6">
                  Playlist kosong. Gunakan ikon "+" pada lagu untuk menambahkannya!
                </p>
              ) : (
                activePlaylist.tracks.map((track, idx) => (
                  <div key={track.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <SongCard track={track} queueList={activePlaylist.tracks} layout="row" index={idx} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTrackFromPlaylist(activePlaylist.id, track.id)}
                      className="p-2.5 rounded-xl glass-card text-rose-400 hover:bg-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'local' && (
        <div className="space-y-2.5">
          {localTracks.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center opacity-75">
              <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Belum ada audio lokal. Unggah file MP3/WAV/FLAC melalui halaman Search!</p>
            </div>
          ) : (
            localTracks.map((track, idx) => (
              <div key={track.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <SongCard track={track} queueList={localTracks} layout="row" index={idx} />
                </div>
                <button
                  type="button"
                  onClick={() => removeLocalTrack(track.id)}
                  className="p-2.5 rounded-xl glass-card text-rose-400 hover:bg-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
