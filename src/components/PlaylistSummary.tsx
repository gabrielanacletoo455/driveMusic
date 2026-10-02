import React from 'react';
import { SpotifyPlaylistInfo, TrackSyncItem } from '../types';
import { Youtube, Cloud, CheckSquare, Square, AlertCircle, RefreshCw, Sparkles, Zap, FolderCheck } from 'lucide-react';

interface PlaylistSummaryProps {
  playlist: SpotifyPlaylistInfo;
  items: TrackSyncItem[];
  isSearchingAll: boolean;
  isSyncingAll: boolean;
  concurrency: number;
  onConcurrencyChange: (concurrency: number) => void;
  onSearchAllYouTube: () => void;
  onSyncAllToDrive: () => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  selectedCount: number;
}

export const PlaylistSummary: React.FC<PlaylistSummaryProps> = ({
  playlist,
  items,
  isSearchingAll,
  isSyncingAll,
  concurrency,
  onConcurrencyChange,
  onSearchAllYouTube,
  onSyncAllToDrive,
  onToggleSelectAll,
  allSelected,
  selectedCount,
}) => {
  const completedCount = items.filter((i) => i.status === 'completed' || i.status === 'already_in_drive').length;
  const alreadyInDriveCount = items.filter((i) => i.status === 'already_in_drive').length;
  const inProgressCount = items.filter((i) => i.status === 'downloading' || i.status === 'uploading' || i.status === 'searching').length;
  const errorCount = items.filter((i) => i.status === 'error' || i.status === 'not_found').length;
  const ytFoundCount = items.filter((i) => i.ytMatch).length;

  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="bg-[#121212] rounded-3xl border border-[#282828] p-6 sm:p-7 mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-[#222222]">
        {/* Playlist Artwork & Info */}
        <div className="flex items-start sm:items-center gap-4">
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-[0_0_20px_rgba(0,0,0,0.8)] ring-1 ring-[#333]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1a1a1a] border border-[#333] text-[#1DB954] flex items-center justify-center font-bold text-2xl shadow-sm">
              <Sparkles className="w-8 h-8 text-[#1DB954]" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1DB954] bg-[#1DB954]/10 px-2.5 py-0.5 rounded-full border border-[#1DB954]/30">
                ACTIVE QUEUE
              </span>
              <span className="text-xs font-mono text-[#888]">
                {playlist.totalTracks} faixas
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#F0F0F0] tracking-tight leading-tight mt-1">
              {playlist.title}
            </h2>
            {playlist.ownerName && (
              <p className="text-xs text-[#777] font-mono mt-0.5">
                Fonte: {playlist.ownerName}
              </p>
            )}
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Concurrency Selector */}
          <div className="flex items-center gap-1.5 bg-[#171717] border border-[#2d2d2d] rounded-2xl p-1.5 px-3 shadow-inner">
            <span className="text-[11px] font-mono text-[#888] flex items-center gap-1 font-semibold mr-1">
              <Zap className="w-3.5 h-3.5 text-[#1DB954]" />
              Paralelo:
            </span>
            {[2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                id={`btn-concurrency-${val}`}
                onClick={() => onConcurrencyChange(val)}
                disabled={isSyncingAll}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  concurrency === val
                    ? 'bg-[#1DB954] text-black shadow-[0_0_10px_rgba(29,185,84,0.4)]'
                    : 'text-[#888] hover:text-[#f0f0f0] hover:bg-[#252525]'
                } disabled:opacity-50`}
                title={`Baixar ${val} músicas ao mesmo tempo`}
              >
                {val}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-search-all-yt"
              onClick={onSearchAllYouTube}
              disabled={isSearchingAll || isSyncingAll}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold font-mono uppercase tracking-wider rounded-xl bg-[#1c1414] hover:bg-[#2c1a1a] text-red-400 border border-red-900/40 transition-all disabled:opacity-50"
            >
              {isSearchingAll ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
              ) : (
                <Youtube className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
              )}
              <span>{isSearchingAll ? 'Buscando...' : '1. Buscar YT'}</span>
            </button>

            <button
              type="button"
              id="btn-sync-all-drive"
              onClick={onSyncAllToDrive}
              disabled={isSyncingAll || selectedCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black shadow-[0_0_20px_rgba(29,185,84,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSyncingAll ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Sync ({concurrency}x)</span>
                </div>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>2. Sync Drive ({selectedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Quick Stats */}
      <div className="pt-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#888] flex-wrap gap-2">
          <div className="flex items-center gap-3.5 flex-wrap font-mono">
            <span className="font-semibold text-[#f0f0f0]">
              Drive Sync: {completedCount}/{items.length} ({progressPercent}%)
            </span>
            {isSyncingAll && inProgressCount > 0 && (
              <span className="text-[#1DB954] font-bold flex items-center gap-1 animate-pulse">
                <Zap className="w-3 h-3 text-[#1DB954]" />
                {inProgressCount} processando ({concurrency} downloads simultâneos)
              </span>
            )}
            {alreadyInDriveCount > 0 && (
              <>
                <span className="text-[#444]">//</span>
                <span className="text-[#60a5fa] flex items-center gap-1 font-medium" title={`${alreadyInDriveCount} músicas já salvas na sua pasta musicas do Google Drive`}>
                  <FolderCheck className="w-3 h-3 text-[#60a5fa]" /> {alreadyInDriveCount} já no Drive
                </span>
              </>
            )}
            <span className="text-[#444]">//</span>
            <span className="text-red-400 flex items-center gap-1">
              <Youtube className="w-3 h-3 text-red-500" /> {ytFoundCount} YT Matched
            </span>
            {errorCount > 0 && (
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errorCount} falhas
              </span>
            )}
          </div>

          <button
            type="button"
            id="btn-toggle-select-all"
            onClick={onToggleSelectAll}
            className="text-xs font-mono text-[#aaa] hover:text-[#fff] inline-flex items-center gap-1.5 transition-colors"
          >
            {allSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-[#1DB954]" /> Desmarcar Todas
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-[#666]" /> Selecionar Todas
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#181818] h-2.5 rounded-full overflow-hidden border border-[#262626]">
          <div
            className="bg-gradient-to-r from-[#1DB954] to-[#4285F4] h-full transition-all duration-500 rounded-full shadow-[0_0_10px_#1DB954]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
