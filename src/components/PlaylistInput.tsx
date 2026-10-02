import React, { useState } from 'react';
import { Search, Link2, Sparkles, Clipboard, X, ListPlus } from 'lucide-react';

interface PlaylistInputProps {
  isLoading: boolean;
  onImportUrl: (url: string) => void;
  onImportText: (text: string, title: string) => void;
}

const PRESET_PLAYLISTS = [
  {
    name: 'Top Brasil',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX0FOF1IZClF1',
    badge: 'Popular',
  },
  {
    name: 'Today’s Top Hits',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    badge: 'Global',
  },
  {
    name: 'Lo-Fi Beats',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
    badge: 'Chill',
  },
  {
    name: 'Rock Classics',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U',
    badge: 'Rock',
  },
];

export const PlaylistInput: React.FC<PlaylistInputProps> = ({
  isLoading,
  onImportUrl,
  onImportText,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onImportUrl(url.trim());
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // ignore clipboard error
    }
  };

  const handleSubmitCustomText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onImportText(customText, customTitle || 'Minha Lista de Músicas');
  };

  return (
    <div className="bg-[#121212] rounded-3xl border border-[#282828] p-6 sm:p-8 flex flex-col justify-center gap-5 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      {/* Header bar within Bento tile */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222222] pb-4">
        <div className="flex items-center gap-2 bg-[#181818] p-1 rounded-xl border border-[#282828]">
          <button
            type="button"
            id="tab-spotify-link"
            onClick={() => setActiveTab('url')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'url'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'text-[#999] hover:text-[#fff] hover:bg-[#222]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Spotify Source URL
          </button>
          <button
            type="button"
            id="tab-custom-text"
            onClick={() => setActiveTab('text')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'text'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'text-[#999] hover:text-[#fff] hover:bg-[#222]'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            Lista Manual
          </button>
        </div>

        <span className="text-[11px] font-mono text-[#666] tracking-wider uppercase hidden sm:block">
          {activeTab === 'url' ? '// PLAYLIST, ÁLBUM OU FAIXA' : '// 1 MÚSICA POR LINHA'}
        </span>
      </div>

      {activeTab === 'url' ? (
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest text-[#888888] font-bold block">
            Spotify Source URL
          </label>
          <form onSubmit={handleSubmitUrl} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="relative flex-grow flex items-center">
                <div className="absolute left-4 pointer-events-none text-[#1DB954]">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.491 17.293c-.215.353-.675.465-1.028.249-2.856-1.745-6.452-2.14-10.686-1.171-.403.093-.81-.157-.903-.561-.093-.404.157-.811.561-.903 4.634-1.059 8.608-.604 11.807 1.353.353.216.464.676.249 1.033zm1.465-3.264c-.269.439-.844.582-1.282.313-3.269-2.008-8.252-2.592-12.119-1.417-.497.151-1.022-.128-1.173-.625-.151-.497.128-1.021.625-1.173 4.422-1.343 9.907-.695 13.636 1.599.438.27.581.844.313 1.282v.021zm.126-3.411c-3.92-2.327-10.379-2.542-14.135-1.402-.601.182-1.235-.164-1.417-.765-.182-.6.164-1.235.765-1.417 4.311-1.308 11.439-1.053 15.96 1.63.541.321.716 1.018.395 1.559-.321.541-1.018.717-1.559.395h-.009z"/>
                  </svg>
                </div>
                <input
                  id="input-spotify-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded-2xl pl-12 pr-24 py-3.5 text-sm sm:text-base text-[#F0F0F0] placeholder-[#555] outline-none focus:border-[#1DB954] transition-colors"
                  disabled={isLoading}
                />
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  {url && (
                    <button
                      type="button"
                      onClick={() => setUrl('')}
                      className="p-1 text-[#777] hover:text-[#fff] rounded-lg"
                      title="Limpar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1 text-[#aaa] hover:text-[#fff] hover:bg-[#252525] text-xs font-mono font-medium rounded-lg border border-[#333] bg-[#1a1a1a] transition-all flex items-center gap-1"
                    title="Colar da área de transferência"
                  >
                    <Clipboard className="w-3 h-3 text-[#777]" />
                    <span className="hidden sm:inline">Colar</span>
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                id="btn-fetch-playlist"
                type="submit"
                disabled={isLoading || !url.trim()}
                className="bg-[#1DB954] hover:bg-[#1ed760] text-black px-8 py-3.5 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(29,185,84,0.25)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 stroke-[2.5]" />
                    <span>Analisar</span>
                  </>
                )}
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#666] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#1DB954]" /> Exemplos:
              </span>
              {PRESET_PLAYLISTS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setUrl(p.url)}
                  className="text-xs px-3 py-1 rounded-xl border border-[#2a2a2a] bg-[#181818] hover:bg-[#222222] hover:border-[#444] text-[#ccc] hover:text-[#fff] font-medium transition-all"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </form>
        </div>
      ) : (
        <form onSubmit={handleSubmitCustomText} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-[#888888] font-bold block mb-1.5">
              Título da Lista
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Ex: Minhas Favoritas 2026"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-2xl text-sm text-[#F0F0F0] placeholder-[#555] outline-none focus:border-[#1DB954]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-[#888888] font-bold block mb-1.5">
              Músicas (uma por linha: Artista - Nome da Música)
            </label>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={"Coldplay - Viva La Vida\nAlok - Hear Me Now\nImagine Dragons - Believer\nQueen - Bohemian Rhapsody"}
              className="w-full p-4 bg-[#1a1a1a] border border-[#333333] rounded-2xl text-xs sm:text-sm font-mono text-[#F0F0F0] placeholder-[#555] outline-none focus:border-[#1DB954]"
            />
          </div>

          <div className="flex justify-end">
            <button
              id="btn-import-custom-text"
              type="submit"
              disabled={isLoading || !customText.trim()}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black px-7 py-3 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all disabled:opacity-40"
            >
              Importar Lista
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
