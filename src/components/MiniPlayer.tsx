import React, { useRef } from 'react';
import { DriveFileItem } from '../types';
import { parseTrackName, formatTime } from './MusicPlayer';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Music,
  Disc3,
  ExternalLink
} from 'lucide-react';

interface MiniPlayerProps {
  currentFile: DriveFileItem | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onExpandPlayer: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentFile,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  onExpandPlayer,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  if (!currentFile) return null;

  const trackInfo = parseTrackName(currentFile.name);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percent = Math.max(0, Math.min(1, clickX / width));
    onSeek(percent * duration);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e0e]/95 backdrop-blur-md border-t border-[#262626] shadow-[0_-10px_30px_rgba(0,0,0,0.7)]">
      {/* Top progress scrubber */}
      <div
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className="h-1.5 w-full bg-[#202020] hover:h-2 cursor-pointer transition-all relative group"
        title="Progresso da música"
      >
        <div
          className="h-full bg-[#1DB954] transition-all group-hover:bg-[#1ed760]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Left: Track info */}
        <div 
          onClick={onExpandPlayer} 
          className="flex items-center gap-3 min-w-0 max-w-[280px] sm:max-w-sm cursor-pointer group"
          title="Clique para abrir o Player completo"
        >
          <div className="w-11 h-11 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] group-hover:border-[#1DB954]/50 flex items-center justify-center text-[#1DB954] shrink-0 transition-colors shadow-md">
            <Disc3 className={`w-6 h-6 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-bold text-[#F0F0F0] group-hover:text-[#1DB954] block truncate transition-colors">
              {trackInfo.title}
            </span>
            <span className="text-[11px] text-[#777] block truncate">
              {trackInfo.artist}
            </span>
          </div>
        </div>

        {/* Center: Controls & Timestamps */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevious}
              className="p-1.5 text-[#888] hover:text-white transition-colors"
              title="Música Anterior"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-[0_0_15px_rgba(29,185,84,0.4)] hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Pausar' : 'Tocar'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              className="p-1.5 text-[#888] hover:text-white transition-colors"
              title="Próxima Música"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          <div className="text-[10px] font-mono text-[#666] hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right: Volume & Expand */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="text-[#777] hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 accent-[#1DB954] h-1.5 bg-[#252525] rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={onExpandPlayer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-[#ddd] text-xs font-mono font-semibold border border-[#2e2e2e] transition-colors"
            title="Abrir Player de Música Completo"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#1DB954]" />
            <span className="hidden sm:inline">Expandir Player</span>
          </button>
        </div>
      </div>
    </div>
  );
};
