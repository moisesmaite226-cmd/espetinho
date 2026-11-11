import React, { useState, useRef } from 'react';
import { AppSettings } from '../types';
import { AppStorage } from '../services/storage';
import { Settings, Save, Download, Upload, RotateCcw, X, Check, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onReloadAllData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onReloadAllData,
  onClose,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [ownerName, setOwnerName] = useState(settings.ownerName || '');
  const [ownerPixKey, setOwnerPixKey] = useState(settings.ownerPixKey || '');
  const [pixKeyType, setPixKeyType] = useState(settings.pixKeyType || 'celular');
  const [defaultCreditLimit, setDefaultCreditLimit] = useState(
    settings.defaultCreditLimit?.toString() || '120'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      storeName: storeName.trim() || 'Espeto & Gelada',
      ownerName: ownerName.trim(),
      ownerPixKey: ownerPixKey.trim(),
      pixKeyType,
      defaultCreditLimit: parseFloat(defaultCreditLimit) || 100,
    };
    onSaveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleExportBackup = () => {
    const backupJson = AppStorage.exportFullBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_espeto_gelada_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = AppStorage.importFullBackup(content);
        if (ok) {
          alert('Backup restaurado com sucesso!');
          onReloadAllData();
          onClose();
        } else {
          alert('Arquivo de backup inválido.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('Tem certeza que deseja restaurar os dados de exemplo? As alterações atuais serão substituídas.')) {
      AppStorage.resetToDemo();
      onReloadAllData();
      alert('Dados de exemplo restaurados com sucesso!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 text-amber-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações do Estabelecimento</h3>
              <p className="text-xs text-neutral-400">Pix para cobrança e gestão de dados</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Nome do Estabelecimento *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Espeto do Paulão & Cerveja Gelada"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Nome do Proprietário / Responsável
            </label>
            <input
              type="text"
              placeholder="Ex: Paulo Henrique"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Pix Key Configuration */}
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Chave Pix (Injetada automaticamente nas cobranças do WhatsApp)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Tipo de Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                >
                  <option value="celular">Celular</option>
                  <option value="cpf">CPF / CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Chave Pix</label>
                <input
                  type="text"
                  placeholder="Ex: 11987654321 ou cpf..."
                  value={ownerPixKey}
                  onChange={(e) => setOwnerPixKey(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Limite de Crédito Padrão Sugerido para Novos Clientes (R$)
            </label>
            <input
              type="number"
              step="10"
              value={defaultCreditLimit}
              onChange={(e) => setDefaultCreditLimit(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl flex items-center gap-1.5 shadow-md"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Salvo!' : 'Salvar Configurações'}</span>
            </button>
          </div>
        </form>

        {/* Data & Backup Section */}
        <div className="border-t border-neutral-800 pt-4 space-y-3">
          <span className="text-xs font-bold text-neutral-300 block">
            Segurança & Backup dos Dados
          </span>
          <p className="text-[11px] text-neutral-400">
            Seus dados ficam salvos com segurança neste navegador. Recomendamos baixar um backup periodicamente para guardar no computador ou celular.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors border border-neutral-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Backup (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors border border-neutral-700"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurar de Arquivo</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />

            <button
              type="button"
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg transition-colors border border-rose-900/50 ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar Dados de Demonstração</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
