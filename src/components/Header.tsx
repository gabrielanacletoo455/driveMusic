import React from 'react';
import { UserProfile, DriveFolderInfo } from '../types';
import { Folder, LogOut, CheckCircle2, ExternalLink, Play, Headphones, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  folderInfo: DriveFolderInfo | null;
  isConnecting: boolean;
  activeTab: 'sync' | 'player';
  onTabChange: (tab: 'sync' | 'player') => void;
  tracksInDriveCount: number;
  isPlayingMusic?: boolean;
  onConnect: () => void;
  onLogout: () => void;
  onOpenFolderModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  folderInfo,
  isConnecting,
  activeTab,
  onTabChange,
  tracksInDriveCount,
  isPlayingMusic = false,
  onConnect,
  onLogout,
  onOpenFolderModal,
}) => {
  return (
    <header className="border-b border-[#222222] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
        {/* Brand & Tab Navigation */}
        <div className="flex items-center gap-5">
          <div 
            onClick={() => onTabChange('sync')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(29,185,84,0.35)] shrink-0 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.491 17.293c-.215.353-.675.465-1.028.249-2.856-1.745-6.452-2.14-10.686-1.171-.403.093-.81-.157-.903-.561-.093-.404.157-.811.561-.903 4.634-1.059 8.608-.604 11.807 1.353.353.216.464.676.249 1.033zm1.465-3.264c-.269.439-.844.582-1.282.313-3.269-2.008-8.252-2.592-12.119-1.417-.497.151-1.022-.128-1.173-.625-.151-.497.128-1.021.625-1.173 4.422-1.343 9.907-.695 13.636 1.599.438.27.581.844.313 1.282v.021zm.126-3.411c-3.92-2.327-10.379-2.542-14.135-1.402-.601.182-1.235-.164-1.417-.765-.182-.6.164-1.235.765-1.417 4.311-1.308 11.439-1.053 15.96 1.63.541.321.716 1.018.395 1.559-.321.541-1.018.717-1.559.395h-.009z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F0F0F0] tracking-tight text-lg">
                  PlaylistSync <span className="text-[#1DB954]">Pro</span>
                </span>
              </div>
              <p className="text-[11px] text-[#777] hidden md:block font-mono">
                Spotify // YouTube Engine // Google Drive
              </p>
            </div>
          </div>

          {/* Primary View Switcher Buttons in Top Navigation */}
          <div className="flex items-center bg-[#141414] p-1 rounded-2xl border border-[#282828] shadow-inner">
            <button
              id="tab-btn-sync"
              type="button"
              onClick={() => onTabChange('sync')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                activeTab === 'sync'
                  ? 'bg-[#222] text-[#F0F0F0] shadow-sm border border-[#333]'
                  : 'text-[#888] hover:text-[#eee] hover:bg-[#1a1a1a]'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>Sincronizador</span>
            </button>

            <button
              id="tab-btn-player"
              type="button"
              onClick={() => onTabChange('player')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all relative ${
                activeTab === 'player'
                  ? 'bg-[#1DB954] text-black shadow-[0_0_15px_rgba(29,185,84,0.35)]'
                  : 'text-[#888] hover:text-[#eee] hover:bg-[#1a1a1a]'
              }`}
            >
              <Headphones className={`w-3.5 h-3.5 ${activeTab === 'player' ? 'text-black' : 'text-[#1DB954]'}`} />
              <span>Player da Pasta</span>
              {tracksInDriveCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'player'
                      ? 'bg-black text-[#1DB954]'
                      : 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30'
                  }`}
                >
                  {tracksInDriveCount}
                </span>
              )}
              {isPlayingMusic && activeTab !== 'player' && (
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Right Actions / Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {folderInfo && (
                <button
                  id="btn-view-drive-folder"
                  onClick={onOpenFolderModal}
                  className="hidden lg:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#ddd] bg-[#161616] hover:bg-[#202020] rounded-xl transition-all border border-[#2d2d2d]"
                  title="Ver pasta 'musicas' no Google Drive"
                >
                  <Folder className="w-3.5 h-3.5 text-[#4285F4] fill-[#4285F4]/20" />
                  <span className="font-mono">/musicas</span>
                  {folderInfo.webViewLink && (
                    <a
                      href={folderInfo.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#666] hover:text-white ml-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </button>
              )}

              <div className="flex items-center gap-2.5 bg-[#141414] border border-[#282828] rounded-full pl-1.5 pr-3 py-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-[#1DB954]/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1DB954] text-black text-xs font-bold flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#f0f0f0] leading-tight truncate max-w-[100px] sm:max-w-[140px]">
                    {user.displayName || user.email}
                  </span>
                  <span className="text-[10px] text-[#1DB954] font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Drive Ready
                  </span>
                </div>
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="text-[#777] hover:text-rose-400 p-1 rounded-md hover:bg-[#222] transition-colors ml-1"
                  title="Desconectar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <button
              id="btn-google-signin"
              onClick={onConnect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-[#1DB954] text-black text-xs font-black rounded-full transition-all duration-200 disabled:opacity-50 uppercase tracking-wider shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isConnecting ? 'Conectando...' : 'Connect Drive'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
