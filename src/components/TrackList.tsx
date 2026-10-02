import React, { useState, useMemo } from 'react';
import { TrackSyncItem } from '../types';
import { TrackItem } from './TrackItem';
import { Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface TrackListProps {
  items: TrackSyncItem[];
  isProcessing: boolean;
  onToggleSelect: (id: string) => void;
  onSearchYouTube: (item: TrackSyncItem) => void;
  onSyncToDrive: (item: TrackSyncItem) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  items,
  isProcessing,
  onToggleSelect,
  onSearchYouTube,
  onSyncToDrive,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'error'>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesText =
        item.track.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        item.track.artistString.toLowerCase().includes(filterQuery.toLowerCase());

      if (!matchesText) return false;

      if (statusFilter === 'completed') {
        return item.status === 'completed' || item.status === 'already_in_drive';
      }
      if (statusFilter === 'pending') {
        return item.status === 'idle' || item.status === 'found' || item.status === 'searching';
      }
      if (statusFilter === 'error') {
        return item.status === 'error' || item.status === 'not_found';
      }

      return true;
    });
  }, [items, filterQuery, statusFilter]);

  return (
    <div className="bg-[#121212] rounded-3xl border border-[#282828] p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-[#222]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrar músicas ou artistas..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-[#F0F0F0] placeholder-[#555] focus:outline-none focus:border-[#1DB954] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 bg-[#161616] p-1 rounded-xl border border-[#262626]">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'text-[#888] hover:text-[#fff] hover:bg-[#202020]'
            }`}
          >
            Todas ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'text-[#888] hover:text-[#fff] hover:bg-[#202020]'
            }`}
          >
            <Clock className="w-3 h-3" />
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'text-[#888] hover:text-[#fff] hover:bg-[#202020]'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            No Drive
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'error'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'text-[#888] hover:text-[#fff] hover:bg-[#202020]'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            Falhas
          </button>
        </div>
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-[#666] font-mono">
          <p className="text-sm">Nenhuma música encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => (
            <TrackItem
              key={item.id}
              item={item}
              index={index}
              isProcessing={isProcessing}
              onToggleSelect={onToggleSelect}
              onSearchYouTube={onSearchYouTube}
              onSyncToDrive={onSyncToDrive}
            />
          ))}
        </div>
      )}
    </div>
  );
};
