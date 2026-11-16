import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition-colors whitespace-nowrap"
        title="Instalar aplicativo na tela inicial do celular ou PC"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Instalar no iPhone</span>
          <span className="sm:hidden">App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Instalar no iPhone / iPad</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-neutral-300 list-decimal list-inside">
                <li>
                  Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.
                </li>
                <li>
                  Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  Toque em <strong>Adicionar</strong> para abrir direto como aplicativo.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2 text-xs font-bold text-neutral-950"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-neutral-950 shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo Offline — dados salvos no aparelho</span>
    </div>
  );
};
