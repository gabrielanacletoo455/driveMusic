import React from 'react';
import { Cloud, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  count?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar e Iniciar',
  cancelText = 'Cancelar',
  count,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] rounded-3xl border border-[#282828] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-md w-full p-7 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#F0F0F0] leading-snug">
              {title}
            </h3>
            <p className="text-xs text-[#888] mt-1.5 leading-relaxed font-mono">
              {description}
            </p>

            {count !== undefined && (
              <div className="mt-3.5 p-3 bg-[#181818] border border-[#282828] rounded-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-[#888]">Total selecionado:</span>
                <span className="font-bold text-[#1DB954]">{count} {count === 1 ? 'música' : 'músicas'}</span>
              </div>
            )}
          </div>

          <button
            onClick={onCancel}
            className="text-[#666] hover:text-[#fff] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs font-mono font-bold text-[#888] hover:text-[#fff] hover:bg-[#1f1f1f] rounded-xl border border-[#2e2e2e] transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-[#1DB954] hover:bg-[#1ed760] rounded-xl shadow-[0_0_15px_rgba(29,185,84,0.3)] transition-all"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
