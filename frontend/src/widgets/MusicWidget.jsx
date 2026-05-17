import { Pause, Play, Search, SkipForward, Volume2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { WidgetShell } from '../components/WidgetShell';
import { Button } from '../components/Button';
import { ErrorState } from '../components/ErrorState';

export function MusicWidget(props) {
  const audioRef = useRef(null);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('audius');
  const [tracks, setTracks] = useState([]);
  const [legacyPlaylist] = useLocalStorage('life:playlist', []);
  const [playlists, setPlaylists] = useLocalStorage('life:playlists', [{ id: 'favorites', name: 'Favoriten', tracks: [] }]);
  const [activePlaylistId, setActivePlaylistId] = useLocalStorage('life:active-playlist', 'favorites');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (legacyPlaylist.length && playlists.every((playlist) => playlist.tracks.length === 0)) {
      setPlaylists([{ id: 'favorites', name: 'Favoriten', tracks: legacyPlaylist }]);
    }
  }, [legacyPlaylist, playlists, setPlaylists]);

  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId) || playlists[0] || { id: 'favorites', name: 'Favoriten', tracks: [] };

  async function search(event) {
    event.preventDefault();
    setError('');
    try {
      setTracks(await api.music(query, provider));
    } catch (err) {
      setError(err.message);
    }
  }

  function play(track) {
    setCurrent(track);
    setPlaying(true);
    setTimeout(() => audioRef.current?.play(), 50);
  }

  async function toggle() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else await audioRef.current.play();
  }

  function next() {
    const queue = activePlaylist.tracks.length ? activePlaylist.tracks : tracks;
    if (!queue.length) return;
    const index = queue.findIndex((track) => track.id === current?.id);
    play(queue[(index + 1) % queue.length] || queue[0]);
  }

  function seek(value) {
    const nextTime = Number(value);
    setProgress(nextTime);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
  }

  function createPlaylist(event) {
    event.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    const id = `playlist-${Date.now()}`;
    setPlaylists((items) => [...items, { id, name, tracks: [] }]);
    setActivePlaylistId(id);
    setNewPlaylistName('');
  }

  function addToPlaylist(track) {
    setPlaylists((items) => items.map((playlist) => {
      if (playlist.id !== activePlaylist.id) return playlist;
      if (playlist.tracks.some((item) => item.id === track.id)) return playlist;
      return { ...playlist, tracks: [...playlist.tracks, track] };
    }));
  }

  function removeFromPlaylist(trackId) {
    setPlaylists((items) => items.map((playlist) => playlist.id === activePlaylist.id
      ? { ...playlist, tracks: playlist.tracks.filter((track) => track.id !== trackId) }
      : playlist));
  }

  return (
    <WidgetShell title="Musik" icon={Play} className="lg:col-span-2" {...props}>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" onSubmit={search}>
        <input className="life-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Song, Artist, Stimmung..." />
        <select className="life-input sm:w-36" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="audius">Audius</option>
          <option value="jamendo">Jamendo</option>
        </select>
        <Button><Search className="h-4 w-4" /> Suchen</Button>
      </form>
      <ErrorState message={error} />
      <div className="mb-4 grid gap-3 rounded-md bg-white/5 p-3 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Playlist</label>
          <select className="life-input" value={activePlaylist.id} onChange={(event) => setActivePlaylistId(event.target.value)}>
            {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name} ({playlist.tracks.length})</option>)}
          </select>
        </div>
        <form className="flex items-end gap-2" onSubmit={createPlaylist}>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Neue Playlist</label>
            <input className="life-input" value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="z.B. Fokus, Training, Abend" />
          </div>
          <Button type="submit" variant="ghost">Erstellen</Button>
        </form>
      </div>
      <div className="grid max-h-72 gap-2 overflow-auto pr-1 md:grid-cols-2">
        {tracks.map((track) => (
          <div key={track.id} className="flex items-center gap-3 rounded-md bg-white/5 p-2">
            <img className="h-12 w-12 rounded-md object-cover" src={track.artwork || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=160&q=70'} alt="" />
            <button className="min-w-0 flex-1 text-left" onClick={() => play(track)}>
              <p className="truncate text-sm font-semibold text-white">{track.title}</p>
              <p className="truncate text-xs text-slate-400">{track.artist}</p>
            </button>
            <button className="icon-soft" onClick={() => addToPlaylist(track)} title={`Zu ${activePlaylist.name} hinzufuegen`}>+</button>
          </div>
        ))}
      </div>
      {!!activePlaylist.tracks.length && (
        <div className="mt-4 rounded-md bg-white/5 p-3">
          <p className="mb-2 text-sm font-semibold text-cyan-200">{activePlaylist.name}</p>
          <div className="grid max-h-32 gap-2 overflow-auto md:grid-cols-2">
            {activePlaylist.tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2 rounded-md bg-slate-950/60 p-2">
                <button className="min-w-0 flex-1 text-left" onClick={() => play(track)}>
                  <p className="truncate text-sm text-white">{track.title}</p>
                  <p className="truncate text-xs text-slate-400">{track.artist}</p>
                </button>
                <button className="icon-soft" onClick={() => removeFromPlaylist(track.id)}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 rounded-md border border-cyan-300/20 bg-slate-950/70 p-3">
        <audio
          ref={audioRef}
          src={current?.streamUrl || ''}
          onEnded={next}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || current?.duration || 0)}
        />
        <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs text-slate-400">
          <span>{formatTime(progress)}</span>
          <input className="w-full accent-cyan-300" type="range" min="0" max={duration || 0} step="1" value={Math.min(progress, duration || 0)} onChange={(e) => seek(e.target.value)} />
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="icon-soft" onClick={toggle}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
          <button className="icon-soft" onClick={next}><SkipForward className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{current?.title || 'Kein Song aktiv'}</p>
            <p className="truncate text-xs text-slate-400">{current?.artist || `${activePlaylist.tracks.length} Songs in ${activePlaylist.name}`}</p>
          </div>
          <Volume2 className="h-4 w-4 text-slate-400" />
          <input className="w-24 accent-cyan-300" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </div>
      </div>
    </WidgetShell>
  );
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
