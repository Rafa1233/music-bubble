import React, { useState } from 'react';
import { Heart, ListMusic, Plus, Trash2, Play, HardDrive, ListOrdered, User, Edit3, ArrowUpDown } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

export default function Library() {
  const {
    likedSongs,
    playlists,
    localTracks,
    queue,
    followedArtists,
    currentTrack,
    createPlaylist,
    editPlaylist,
    sortPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    removeLocalTrack,
    removeFromQueue,
    openArtist,
    playTrack,
  } = useAudio();
  const { settings } = useTheme();

  const [tab, setTab] = useState('liked');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [plFilter, setPlFilter] = useState('');
  const [editingPl, setEditingPl] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = createPlaylist(newName, newDesc);
    setNewName('');
    setNewDesc('');
    if (created) setSelectedPlaylistId(created.id);
  };

  const filteredPlaylistTracks = activePlaylist
    ? activePlaylist.tracks.filter(
        (t) =>
          !plFilter.trim() ||
          t.title.toLowerCase().includes(plFilter.toLowerCase()) ||
          t.artist.toLowerCase().includes(plFilter.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-5 pb-6">
      <div data-no-tab-swipe className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'liked', label: `Disukai (${likedSongs.length})`, icon: Heart },
          { id: 'playlists', label: `Playlist (${playlists.length})`, icon: ListMusic },
          { id: 'queue', label: `Antrian (${queue.length})`, icon: ListOrdered },
          { id: 'artists', label: `Artis (${followedArtists.length})`, icon: User },
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
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition ${
                active ? 'text-zinc-950' : 'glass-card text-main opacity-85'
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
            <div className="glass-card rounded-3xl p-8 text-center text-muted">
              <Heart className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Belum ada lagu yang disukai.</p>
            </div>
          ) : (
            likedSongs.map((track, idx) => (
              <SongCard key={track.id} track={track} queueList={likedSongs} layout="row" index={idx} />
            ))
          )}
        </div>
      )}

      {tab === 'playlists' && (
        <div className="space-y-4">
          {!activePlaylist ? (
            <>
              <form onSubmit={handleCreatePlaylist} className="glass-card rounded-3xl p-4 space-y-3">
                <p className="text-sm font-heading font-bold text-main">Buat Playlist Baru</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama playlist" className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
                  <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Deskripsi (opsional)" className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 inline-flex items-center gap-1.5" style={{ backgroundColor: settings.accentColor }}>
                  <Plus className="w-4 h-4" /> Buat Playlist
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => {
                      setSelectedPlaylistId(pl.id);
                      setEditingPl(false);
                      setPlFilter('');
                    }}
                    className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="font-heading font-bold truncate text-main">{pl.name}</p>
                      <p className="text-xs text-muted truncate">{pl.description || `${pl.tracks.length} lagu tersimpan`}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {pl.tracks.length > 0 && (
                        <button type="button" onClick={() => playTrack(pl.tracks[0], pl.tracks)} className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950" style={{ backgroundColor: settings.accentColor }}>
                          <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => deletePlaylist(pl.id)} className="p-2 rounded-full hover:bg-rose-500/20 text-rose-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setSelectedPlaylistId(null)} className="text-xs font-semibold underline text-main">
                  ← Semua Playlist
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(activePlaylist.name);
                      setEditDesc(activePlaylist.description || '');
                      setEditingPl((v) => !v);
                    }}
                    className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 text-main"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => sortPlaylist(activePlaylist.id, 'title')}
                    className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 text-main"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" /> Urut A-Z
                  </button>
                  {activePlaylist.tracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => playTrack(activePlaylist.tracks[0], activePlaylist.tracks)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold text-zinc-950 flex items-center gap-1"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      <Play className="w-3.5 h-3.5 fill-zinc-950" /> Putar
                    </button>
                  )}
                </div>
              </div>

              {editingPl ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    editPlaylist(activePlaylist.id, { name: editName, description: editDesc });
                    setEditingPl(false);
                  }}
                  className="glass-card rounded-2xl p-4 space-y-2.5"
                >
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none" />
                  <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Deskripsi" className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none" />
                  <button type="submit" className="px-4 py-1.5 rounded-xl text-xs font-bold text-zinc-950" style={{ backgroundColor: settings.accentColor }}>
                    Simpan Perubahan
                  </button>
                </form>
              ) : (
                <div className="glass-card rounded-2xl p-4 space-y-2">
                  <h3 className="text-lg font-heading font-bold text-main">{activePlaylist.name}</h3>
                  {activePlaylist.description && <p className="text-xs text-muted">{activePlaylist.description}</p>}
                  {activePlaylist.tracks.length > 2 && (
                    <input
                      type="text"
                      value={plFilter}
                      onChange={(e) => setPlFilter(e.target.value)}
                      placeholder="Cari lagu di dalam playlist ini..."
                      className="glass-input w-full rounded-xl px-3 py-1.5 text-xs outline-none"
                    />
                  )}
                </div>
              )}

              {filteredPlaylistTracks.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">Tidak ada lagu di playlist ini.</p>
              ) : (
                filteredPlaylistTracks.map((track, idx) => (
                  <div key={track.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <SongCard track={track} queueList={activePlaylist.tracks} layout="row" index={idx} />
                    </div>
                    <button type="button" onClick={() => removeTrackFromPlaylist(activePlaylist.id, track.id)} className="p-2.5 rounded-xl glass-card text-rose-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'queue' && (
        <div className="space-y-2.5">
          {queue.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center text-muted">Antrian putar masih kosong.</div>
          ) : (
            queue.map((track, idx) => (
              <div key={track.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <SongCard track={track} queueList={queue} layout="row" index={idx} />
                </div>
                {currentTrack?.id !== track.id && (
                  <button type="button" onClick={() => removeFromQueue(track.id)} className="p-2.5 rounded-xl glass-card text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'artists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {followedArtists.length === 0 ? (
            <div className="col-span-full glass-card rounded-3xl p-8 text-center text-muted">
              Belum mengikuti artis. Ketuk nama artis pada lagu untuk membuka profilnya!
            </div>
          ) : (
            followedArtists.map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => openArtist(ar.id, ar.name, ar.avatar)}
                className="glass-card rounded-2xl p-4 flex flex-col items-center text-center gap-2"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                  {ar.avatar ? <img src={ar.avatar} alt={ar.name} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-white/60" />}
                </div>
                <p className="text-sm font-bold truncate w-full text-main">{ar.name}</p>
              </button>
            ))
          )}
        </div>
      )}

      {tab === 'local' && (
        <div className="space-y-2.5">
          {localTracks.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center text-muted">
              Belum ada audio lokal. Unggah file MP3/WAV/FLAC melalui halaman Search!
            </div>
          ) : (
            localTracks.map((track, idx) => (
              <div key={track.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <SongCard track={track} queueList={localTracks} layout="row" index={idx} />
                </div>
                <button type="button" onClick={() => removeLocalTrack(track.id)} className="p-2.5 rounded-xl glass-card text-rose-400">
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
