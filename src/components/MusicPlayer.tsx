import React, { useState, useEffect, useRef } from 'react';
import { DriveFileItem, DriveFolderInfo } from '../types';
import { listFilesInMusicFolder } from '../services/driveService';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Music, 
  Folder, 
  ExternalLink, 
  Download, 
  Search, 
  RefreshCw, 
  Disc3, 
  HardDrive,
  ListMusic,
  Clock,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface MusicPlayerProps {
  accessToken: string | null;
  folderInfo: DriveFolderInfo | null;
  onBackToSync?: () => void;
  // Shared player state if lifted
  currentFile: DriveFileItem | null;
  isPlaying: boolean;
  onPlayFile: (file: DriveFileItem) => void;
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
  isShuffle: boolean;
  onToggleShuffle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onCycleRepeat: () => void;
  files: DriveFileItem[];
  isLoadingFiles: boolean;
  onRefreshFiles: () => void;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function parseTrackName(fileName: string): { artist: string; title: string } {
  const clean = fileName.replace(/\.(mp3|m4a|wav|webm|opus|flac|aac)$/i, '');
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    };
  }
  return {
    artist: 'Música do Drive',
    title: clean,
  };
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  accessToken,
  folderInfo,
  onBackToSync,
  currentFile,
  isPlaying,
  onPlayFile,
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
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onCycleRepeat,
  files,
  isLoadingFiles,
  onRefreshFiles,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTrackInfo = currentFile ? parseTrackName(currentFile.name) : null;
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
    <div className="space-y-6">
      {/* Top Bar / Navigation info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-[#262626] rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          {onBackToSync && (
            <button
              id="btn-back-to-sync"
              onClick={onBackToSync}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#1c1c1c] hover:bg-[#282828] text-[#ddd] text-xs font-mono font-semibold border border-[#333] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sincronizador</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
              <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F0F0F0] tracking-tight">
                Player de Música Google Drive
              </h2>
              <p className="text-xs text-[#888] font-mono flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#4285F4]" />
                <span>/My Drive/{folderInfo?.name || 'musicas'}</span>
                <span className="text-[#444]">//</span>
                <span className="text-[#1DB954]">{files.length} {files.length === 1 ? 'música' : 'músicas'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-refresh-player-files"
            onClick={onRefreshFiles}
            disabled={isLoadingFiles}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold text-[#ccc] bg-[#181818] hover:bg-[#242424] rounded-xl border border-[#2e2e2e] transition-all disabled:opacity-50"
            title="Atualizar lista de músicas da pasta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-[#1DB954]' : ''}`} />
            <span>Atualizar</span>
          </button>

          {folderInfo?.webViewLink && (
            <a
              href={folderInfo.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-bold text-[#60a5fa] bg-[#4285F4]/10 hover:bg-[#4285F4]/20 rounded-xl border border-[#4285F4]/30 transition-all"
            >
              <span>Abrir no Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Main Player Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Hero: Active Player Card */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-7 flex-1 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            {/* Ambient Glow */}
            <div 
              className={`absolute top-0 right-0 w-64 h-64 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
                isPlaying ? 'opacity-100' : 'opacity-20'
              }`} 
            />

            {/* Top Badge */}
            <div className="flex items-center justify-between z-10 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30">
                <Sparkles className="w-3 h-3" />
                {isPlaying ? 'Reproduzindo agora' : currentFile ? 'Em pausa' : 'Selecione uma faixa'}
              </span>

              {/* Equalizer animation */}
              {isPlaying && (
                <div className="flex items-end gap-1 h-4">
                  <span className="w-1 bg-[#1DB954] rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                  <span className="w-1 bg-[#1DB954] rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4" />
                  <span className="w-1 bg-[#1DB954] rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2" />
                  <span className="w-1 bg-[#1DB954] rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-3.5" />
                </div>
              )}
            </div>

            {/* Album / Disc Artwork Center */}
            <div className="my-auto py-6 flex flex-col items-center justify-center text-center z-10">
              <div className="relative group">
                <div 
                  className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-[#0f0f0f] via-[#1a1a1a] to-[#252525] border-4 border-[#333] shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex items-center justify-center transition-all duration-500 ${
                    isPlaying ? 'ring-4 ring-[#1DB954]/30 rotate-180' : ''
                  }`}
                  style={{ transition: isPlaying ? 'transform 10s linear infinite' : 'transform 0.5s ease-out' }}
                >
                  {/* Vinyl grooves */}
                  <div className="w-36 h-36 rounded-full border border-dashed border-[#444]/40 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-[#333] flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#1DB954] flex items-center justify-center shadow-inner">
                        <Music className="w-8 h-8 text-black" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Artist */}
              <div className="mt-7 max-w-full px-2">
                <h3 className="text-xl sm:text-2xl font-black text-[#F0F0F0] tracking-tight truncate leading-tight">
                  {currentTrackInfo ? currentTrackInfo.title : 'Nenhuma música em execução'}
                </h3>
                <p className="text-sm font-semibold text-[#1DB954] mt-1 truncate">
                  {currentTrackInfo ? currentTrackInfo.artist : 'Escolha uma faixa da lista para ouvir'}
                </p>
                {currentFile?.size && (
                  <span className="text-[10px] font-mono text-[#666] mt-1 block">
                    {currentFile.size} // Áudio Original Google Drive
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Controls Area */}
            <div className="space-y-4 pt-4 z-10">
              {/* Progress Bar & Timestamps */}
              <div className="space-y-1.5">
                <div
                  ref={progressBarRef}
                  onClick={handleProgressBarClick}
                  className="h-2 w-full bg-[#242424] hover:h-2.5 rounded-full cursor-pointer relative overflow-hidden transition-all group"
                  title="Avançar / Retroceder"
                >
                  <div
                    className="h-full bg-[#1DB954] rounded-full transition-all group-hover:bg-[#1ed760]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#888]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Playback Buttons */}
              <div className="flex items-center justify-between gap-2">
                {/* Shuffle */}
                <button
                  id="btn-player-shuffle"
                  type="button"
                  onClick={onToggleShuffle}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isShuffle 
                      ? 'text-[#1DB954] bg-[#1DB954]/15 border border-[#1DB954]/30' 
                      : 'text-[#777] hover:text-[#ddd] hover:bg-[#1a1a1a]'
                  }`}
                  title={isShuffle ? 'Modo Aleatório Ativado' : 'Ativar Modo Aleatório'}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Previous Track */}
                <button
                  id="btn-player-prev"
                  type="button"
                  onClick={onPrevious}
                  disabled={files.length === 0}
                  className="p-3 text-[#ccc] hover:text-white hover:bg-[#202020] rounded-2xl transition-all disabled:opacity-40"
                  title="Música Anterior"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                {/* Big Play/Pause Button */}
                <button
                  id="btn-player-play-pause"
                  type="button"
                  onClick={onTogglePlay}
                  disabled={files.length === 0 && !currentFile}
                  className="w-14 h-14 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-[0_0_25px_rgba(29,185,84,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                  title={isPlaying ? 'Pausar (Espaço)' : 'Tocar (Espaço)'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                {/* Next Track */}
                <button
                  id="btn-player-next"
                  type="button"
                  onClick={onNext}
                  disabled={files.length === 0}
                  className="p-3 text-[#ccc] hover:text-white hover:bg-[#202020] rounded-2xl transition-all disabled:opacity-40"
                  title="Próxima Música"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                {/* Repeat Mode */}
                <button
                  id="btn-player-repeat"
                  type="button"
                  onClick={onCycleRepeat}
                  className={`p-2.5 rounded-xl transition-colors ${
                    repeatMode !== 'off' 
                      ? 'text-[#1DB954] bg-[#1DB954]/15 border border-[#1DB954]/30' 
                      : 'text-[#777] hover:text-[#ddd] hover:bg-[#1a1a1a]'
                  }`}
                  title={
                    repeatMode === 'one'
                      ? 'Repetindo música atual'
                      : repeatMode === 'all'
                      ? 'Repetindo todas as músicas'
                      : 'Repetição desativada'
                  }
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Secondary Controls: Volume & File Actions */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#202020]">
                {/* Volume Slider */}
                <div className="flex items-center gap-2 flex-1 max-w-[170px]">
                  <button
                    onClick={onToggleMute}
                    className="text-[#888] hover:text-white transition-colors"
                    title={isMuted ? 'Desmutar' : 'Mutar'}
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
                    className="w-full accent-[#1DB954] h-1.5 bg-[#252525] rounded-lg cursor-pointer"
                    title="Volume"
                  />
                </div>

                {/* Actions for current track */}
                {currentFile && (
                  <div className="flex items-center gap-2">
                    {accessToken && (
                      <a
                        href={`/api/drive/stream?fileId=${currentFile.id}&token=${encodeURIComponent(accessToken)}`}
                        download={currentFile.name}
                        className="p-2 text-[#888] hover:text-white hover:bg-[#1f1f1f] rounded-xl transition-colors border border-[#2a2a2a]"
                        title="Baixar MP3 do Drive"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {currentFile.webViewLink && (
                      <a
                        href={currentFile.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#60a5fa] hover:text-white hover:bg-[#4285F4]/20 rounded-xl transition-colors border border-[#4285F4]/30"
                        title="Abrir no Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Playlist Queue / Track list from Google Drive */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-7 flex-1 flex flex-col shadow-xl">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#222]">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-[#1DB954]" />
                <h3 className="text-base font-bold text-[#F0F0F0]">
                  Faixas na Pasta <span className="font-mono text-xs text-[#888]">({filteredFiles.length})</span>
                </h3>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar músicas..."
                  className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#1DB954] text-[#F0F0F0] text-xs font-mono rounded-xl pl-9 pr-3 py-2 outline-none transition-all placeholder:text-[#666]"
                />
              </div>
            </div>

            {/* List of Files */}
            <div className="flex-1 overflow-y-auto max-h-[500px] mt-4 space-y-2 pr-1 custom-scrollbar">
              {isLoadingFiles ? (
                <div className="py-20 text-center text-[#777] font-mono">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-[#1DB954]" />
                  <p className="text-xs">Carregando músicas do Google Drive...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-20 text-center text-[#777] font-mono">
                  <Music className="w-10 h-10 mx-auto mb-3 text-[#444]" />
                  {searchQuery ? (
                    <p className="text-xs">Nenhuma música encontrada para &quot;{searchQuery}&quot;</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#bbb]">Nenhuma música na pasta /musicas</p>
                      <p className="text-xs text-[#666] mt-1">
                        Use a aba &quot;Sincronizador&quot; para enviar playlists do Spotify.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredFiles.map((file, idx) => {
                  const isCurrent = currentFile?.id === file.id;
                  const trackInfo = parseTrackName(file.name);

                  return (
                    <div
                      key={file.id}
                      onClick={() => onPlayFile(file)}
                      className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#1DB954]/10 border-[#1DB954]/40 shadow-[0_0_15px_rgba(29,185,84,0.15)]'
                          : 'bg-[#161616] hover:bg-[#1c1c1c] border-[#242424] hover:border-[#333]'
                      }`}
                    >
                      {/* Left: Index & Play Button */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#202020] group-hover:bg-[#1DB954] flex items-center justify-center text-xs font-mono font-bold text-[#888] group-hover:text-black transition-colors shrink-0">
                          {isCurrent ? (
                            isPlaying ? (
                              <Pause className="w-4 h-4 text-[#1DB954] group-hover:text-black fill-current" />
                            ) : (
                              <Play className="w-4 h-4 text-[#1DB954] group-hover:text-black fill-current ml-0.5" />
                            )
                          ) : (
                            <span className="group-hover:hidden">{idx + 1}</span>
                          )}
                          <Play className="w-4 h-4 hidden group-hover:block ml-0.5" />
                        </div>

                        {/* Title & Artist */}
                        <div className="min-w-0">
                          <span
                            className={`text-xs font-bold block truncate ${
                              isCurrent ? 'text-[#1DB954]' : 'text-[#F0F0F0] group-hover:text-white'
                            }`}
                          >
                            {trackInfo.title}
                          </span>
                          <span className="text-[11px] text-[#777] truncate block">
                            {trackInfo.artist}
                          </span>
                        </div>
                      </div>

                      {/* Right: Meta & Direct actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {file.size && (
                          <span className="text-[10px] font-mono text-[#666] hidden sm:inline-block">
                            {file.size}
                          </span>
                        )}

                        {accessToken && (
                          <a
                            href={`/api/drive/stream?fileId=${file.id}&token=${encodeURIComponent(accessToken)}`}
                            download={file.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-[#666] hover:text-[#fff] hover:bg-[#262626] rounded-lg transition-colors"
                            title="Baixar MP3"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-[#666] hover:text-[#60a5fa] hover:bg-[#262626] rounded-lg transition-colors"
                            title="Ver no Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
