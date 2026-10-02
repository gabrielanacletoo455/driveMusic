import React, { useEffect, useState } from 'react';
import { DriveFolderInfo, DriveFileItem } from '../types';
import { listFilesInMusicFolder } from '../services/driveService';
import { Folder, ExternalLink, RefreshCw, X, Music, HardDrive, CheckCircle2, Play, Headphones } from 'lucide-react';

interface DriveFolderViewerProps {
  accessToken: string | null;
  folderInfo: DriveFolderInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPlayer?: () => void;
  onPlayTrack?: (file: DriveFileItem) => void;
}

export const DriveFolderViewer: React.FC<DriveFolderViewerProps> = ({
  accessToken,
  folderInfo,
  isOpen,
  onClose,
  onOpenPlayer,
  onPlayTrack,
}) => {
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!accessToken || !folderInfo?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await listFilesInMusicFolder(accessToken, folderInfo.id);
      setFiles(items);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar arquivos da pasta');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken && folderInfo?.id) {
      fetchFiles();
    }
  }, [isOpen, accessToken, folderInfo?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] rounded-3xl border border-[#282828] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4285F4]/15 border border-[#4285F4]/30 flex items-center justify-center text-[#4285F4]">
              <Folder className="w-5 h-5 fill-[#4285F4]/20" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F0F0F0] font-mono">
                /My Drive/{folderInfo?.name || 'musicas'}
              </h3>
              <p className="text-xs text-[#888] font-mono">
                {files.length} {files.length === 1 ? 'faixa salva' : 'faixas salvas'} na pasta de destino
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPlayer && files.length > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPlayer();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(29,185,84,0.3)]"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Abrir no Player</span>
              </button>
            )}
            <button
              onClick={fetchFiles}
              disabled={isLoading}
              className="p-2 text-[#777] hover:text-[#fff] hover:bg-[#1f1f1f] rounded-xl transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#1DB954]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#777] hover:text-[#fff] hover:bg-[#1f1f1f] rounded-xl transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {folderInfo?.webViewLink && (
            <div className="p-3.5 bg-[#181818] border border-[#2a2a2a] rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#aaa] font-mono">
                <HardDrive className="w-4 h-4 text-[#4285F4]" />
                <span>Google Drive Storage:</span>
              </div>
              <a
                href={folderInfo.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#222] hover:bg-[#2c2c2c] text-[#F0F0F0] text-xs font-mono font-bold rounded-xl border border-[#333] transition-all"
              >
                <span>Abrir no Google Drive</span>
                <ExternalLink className="w-3 h-3 text-[#888]" />
              </a>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center text-[#777] font-mono">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1DB954]" />
              <p className="text-xs">Consultando Google Drive...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-rose-400 text-xs font-mono">
              <p>{error}</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center text-[#777] font-mono">
              <Music className="w-8 h-8 mx-auto mb-2 text-[#444]" />
              <p className="text-sm font-semibold text-[#bbb]">Nenhuma música enviada ainda</p>
              <p className="text-xs text-[#666] mt-1">
                Importe uma playlist e clique em &quot;Sync Drive&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-[#161616] hover:bg-[#1c1c1c] border border-[#262626] rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#F0F0F0] block truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-[#777] font-mono">
                        {file.size || 'Áudio MP3'} {file.createdTime ? `// ${new Date(file.createdTime).toLocaleDateString()}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onPlayTrack && (
                      <button
                        type="button"
                        onClick={() => {
                          onPlayTrack(file);
                          onClose();
                        }}
                        className="text-xs text-black bg-[#1DB954] hover:bg-[#1ed760] font-mono font-bold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shadow-[0_0_10px_rgba(29,185,84,0.3)]"
                        title="Tocar agora no Player de Música"
                      >
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                        <span>Tocar</span>
                      </button>
                    )}

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#60a5fa] hover:text-white font-mono font-bold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#4285F4]/10 hover:bg-[#4285F4]/20 border border-[#4285F4]/30 transition-colors"
                        title="Abrir no Google Drive"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#0e0e0e] border-t border-[#222] flex items-center justify-between">
          <span className="text-xs text-[#777] font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954]" /> Google Drive Connected
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#222] hover:bg-[#333] text-[#F0F0F0] text-xs font-mono font-bold rounded-xl border border-[#333] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
