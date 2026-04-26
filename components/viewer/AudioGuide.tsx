'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioGuideProps {
  audioUrl: string;
  sceneLabel?: string;
}

export function AudioGuide({ audioUrl, sceneLabel }: AudioGuideProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [playing,   setPlaying]   = useState(false);
  const [muted,     setMuted]     = useState(false);
  const [progress,  setProgress]  = useState(0);   // 0-1
  const [duration,  setDuration]  = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Auto-play on mount
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    return () => { el.pause(); };
  }, [audioUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !muted;
    setMuted((v) => !v);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const t = parseFloat(e.target.value) * duration;
    el.currentTime = t;
    setProgress(parseFloat(e.target.value));
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (dismissed) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-72 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-2 shadow-2xl">

      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el && el.duration) setProgress(el.currentTime / el.duration);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* Header row */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="flex-1 text-xs font-semibold text-white truncate">
          {sceneLabel ? `Guía — ${sceneLabel}` : 'Guía de audio'}
        </span>
        <button
          onClick={() => { audioRef.current?.pause(); setDismissed(true); }}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress + time */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 w-8 text-right flex-shrink-0">
          {fmt(progress * duration)}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1.5 accent-blue-400 cursor-pointer"
        />
        <span className="text-[10px] text-gray-500 w-8 flex-shrink-0">
          {duration ? fmt(duration) : '--:--'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={cn('p-1.5 rounded-full transition-colors', muted ? 'text-amber-400' : 'text-gray-400 hover:text-white')}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white transition-colors shadow"
        >
          {playing
            ? <Pause className="w-4 h-4" fill="currentColor" />
            : <Play  className="w-4 h-4 ml-0.5" fill="currentColor" />}
        </button>

        {/* Filler for symmetry */}
        <div className="w-7" />
      </div>
    </div>
  );
}
