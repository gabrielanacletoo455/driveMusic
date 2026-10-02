import React, { useState } from 'react';
import { TrackSyncItem } from '../types';
import { 
  Youtube, 
  Cloud, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  Search, 
  Music,
  Download,
  FolderCheck
} from 'lucide-react';

interface TrackItemProps {
  item: TrackSyncItem;
  index: number;
  isProcessing: boolean;
  onToggleSelect: (id: string) => void;
  onSearchYouTube: (item: TrackSyncItem) => void;
  onSyncToDrive: (item: TrackSyncItem) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  item,
  index,
  isProcessing,
  onToggleSelect,
  onSearchYouTube,
  onSyncToDrive,
}) => {
  const { track, ytMatch, status, statusMessage, error, driveFileLink, selected } = item;
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState(`${track.artistString} ${track.name}`);

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearchQuery.trim()) return;
    onSearchYouTube({
      ...item,
      track: {
        ...track,
        name: customSearchQuery.trim(),
      },
    });
    setShowCustomSearch(false);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'searching':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> Buscando YT...
          </span>
        );
      case 'downloading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/30">
            <Download className="w-3 h-3 animate-bounce" /> Baixando Áudio...
          </span>
        );
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/30 animate-pulse">
            <Cloud className="w-3 h-3" /> Enviando Drive...
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40 shadow-[0_0_8px_rgba(29,185,84,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5" /> No Google Drive
          </span>
        );
      case 'already_in_drive':
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#4285F4]/15 text-[#60a5fa] border border-[#4285F4]/30"
            title={item.duplicateReason ? `Já no Drive (${item.duplicateReason}): ${item.driveFileName}` : `Arquivo existente: ${item.driveFileName}`}
          >
            <FolderCheck className="w-3.5 h-3.5" /> {item.duplicateReason ? `Já no Drive (${item.duplicateReason})` : 'Já no Drive'}
          </span>
        );
      case 'not_found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" /> Não achado no YT
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30" title={error}>
            <AlertCircle className="w-3 h-3" /> {statusMessage || 'Erro'}
          </span>
        );
      default:
        if (ytMatch) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
              <Youtube className="w-3 h-3 text-red-500" /> YT Pronto
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium text-[#666] bg-[#1a1a1a] border border-[#262626]">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        selected ? 'bg-[#181818] border-[#383838] shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'bg-[#141414]/70 border-[#222222] opacity-75'
      } hover:border-[#444]`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Checkbox + Spotify Info */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            disabled={isProcessing}
            className="w-4 h-4 rounded bg-[#222] border-[#444] text-[#1DB954] focus:ring-[#1DB954]/20 cursor-pointer accent-[#1DB954]"
          />

          <span className="text-xs font-mono text-[#555] w-5 text-center hidden sm:block">
            {(index + 1).toString().padStart(2, '0')}
          </span>

          {track.albumCover ? (
            <img
              src={track.albumCover}
              alt={track.name}
              className="w-11 h-11 rounded-xl object-cover ring-1 ring-[#333] shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-[#222] flex items-center justify-center text-[#777] shrink-0">
              <Music className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#F0F0F0] truncate">
                {track.name}
              </span>
              {track.spotifyUrl && (
                <a
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#666] hover:text-[#1DB954] shrink-0 transition-colors"
                  title="Ouvir no Spotify"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#888] mt-0.5 truncate font-mono">
              <span className="truncate">{track.artistString}</span>
              {track.durationFormatted !== '--:--' && (
                <>
                  <span className="text-[#444]">//</span>
                  <span className="text-[11px] text-[#777]">{track.durationFormatted}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle / Right: YouTube match info & status */}
        <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap sm:flex-nowrap pl-7 sm:pl-0">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Direct Google Drive File Link */}
            {driveFileLink && (
              <a
                href={driveFileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold text-[#60a5fa] bg-[#4285F4]/10 hover:bg-[#4285F4]/20 rounded-xl border border-[#4285F4]/30 transition-colors"
                title="Abrir arquivo no Google Drive"
              >
                <FolderCheck className="w-3.5 h-3.5 text-[#4285F4]" />
                <span className="hidden md:inline">Abrir Drive</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            {/* Direct MP3 Download button */}
            {ytMatch && (
              <a
                href={`/api/youtube/download?videoId=${ytMatch.videoId}&title=${encodeURIComponent(`${track.artistString} - ${track.name}`)}&track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artistString)}`}
                download={`${track.artistString} - ${track.name}.mp3`}
                className="p-2 text-[#aaa] hover:text-[#fff] hover:bg-[#252525] rounded-xl transition-colors border border-[#2d2d2d] bg-[#1a1a1a]"
                title="Baixar MP3 diretamente no computador"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Sync single track button */}
            {status !== 'completed' && status !== 'already_in_drive' && (
              <button
                type="button"
                onClick={() => onSyncToDrive(item)}
                disabled={isProcessing || status === 'downloading' || status === 'uploading'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black bg-[#1DB954] hover:bg-[#1ed760] rounded-xl transition-all disabled:opacity-40 shadow-sm"
                title="Sincronizar esta música individualmente"
              >
                <Cloud className="w-3 h-3 stroke-[2.5]" />
                <span>Sync</span>
              </button>
            )}

            {/* Re-search button */}
            <button
              type="button"
              onClick={() => onSearchYouTube(item)}
              disabled={isProcessing}
              className="p-2 text-[#777] hover:text-[#fff] hover:bg-[#252525] rounded-xl transition-colors border border-[#2d2d2d] bg-[#1a1a1a]"
              title="Pesquisar no YouTube novamente"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* YouTube Matched Details Drawer */}
      {ytMatch && (
        <div className="mt-3 pt-2.5 border-t border-[#242424] flex items-center justify-between gap-3 text-xs bg-[#101010] rounded-xl p-2.5 px-3.5 border border-[#222]">
          <div className="flex items-center gap-3 min-w-0">
            {ytMatch.thumbnail ? (
              <img
                src={ytMatch.thumbnail}
                alt={ytMatch.title}
                className="w-9 h-6 rounded-md object-cover ring-1 ring-[#333] shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Youtube className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <div className="min-w-0 truncate">
              <span className="font-semibold text-[#ddd] truncate block">
                {ytMatch.title}
              </span>
              <span className="text-[10px] text-[#777] font-mono">
                Canal: {ytMatch.author} • Duração: {ytMatch.durationFormatted}
              </span>
            </div>
          </div>

          <a
            href={ytMatch.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 font-mono font-medium inline-flex items-center gap-1 shrink-0 text-[11px] bg-red-950/40 px-2 py-1 rounded-lg border border-red-900/30"
            title="Assistir no YouTube"
          >
            <span>Ver Vídeo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
