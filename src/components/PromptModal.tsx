import React, { useState } from 'react';
import { MASTER_PROMPT_TEXT } from '../data/promptTemplate';
import { Copy, Check, FileCode2, Sparkles, X, Share2, Lightbulb } from 'lucide-react';

interface PromptModalProps {
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MASTER_PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Prompt Mestre para o Sistema do seu Amigo
              </h3>
              <p className="text-xs text-neutral-400">
                Pronto para copiar e colar no ChatGPT, Claude ou AI Studio
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tip Box */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-start gap-2.5 text-xs text-neutral-300">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Como usar este prompt:</span>
            <p className="text-neutral-400 text-[11px] mt-0.5">
              Você pode clicar em <strong>"Copiar Prompt Completo"</strong> e enviar diretamente para qualquer inteligência artificial caso queira gerar novas variações, adicionar aplicativo mobile ou customizar com a identidade visual do seu amigo. Além disso, <strong>o sistema aqui na tela já está 100% funcional</strong> com todos esses recursos!
            </p>
          </div>
        </div>

        {/* Prompt Content Viewport */}
        <div className="flex-1 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-xl p-4 font-mono text-xs text-neutral-300 leading-relaxed space-y-2 select-text scrollbar-thin">
          <pre className="whitespace-pre-wrap font-sans text-xs">
            {MASTER_PROMPT_TEXT}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            Contém especificações completas de PDV, Fiado, WhatsApp e Caixa
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-neutral-950" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Prompt Copiado com Sucesso!' : 'Copiar Prompt Completo'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
