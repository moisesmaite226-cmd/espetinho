import React from 'react';
import { 
  Flame, 
  ShoppingBag, 
  BookUser, 
  CircleDollarSign, 
  Package, 
  FileCode2, 
  Settings, 
  Menu,
  X
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export type ActiveTab = 'pdv' | 'fiado' | 'caixa' | 'estoque' | 'prompt';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalDebtPending: number;
  openSettings: () => void;
  openPrompt: () => void;
  storeName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalDebtPending,
  openSettings,
  openPrompt,
  storeName,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-neutral-950 font-bold">
              <Flame className="w-6 h-6 text-neutral-950 fill-neutral-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                {storeName || 'Espeto & Gelada'}
              </span>
              <span className="text-xs text-amber-400 font-medium hidden sm:inline">
                PDV · Caderneta de Fiado · Caixa
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => handleNavClick('pdv')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'pdv'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>PDV Balcão</span>
            </button>

            <button
              onClick={() => handleNavClick('fiado')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'fiado'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <BookUser className="w-4 h-4" />
              <span>Caderneta / Fiado</span>
              {totalDebtPending > 0 && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {formatCurrency(totalDebtPending)}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('caixa')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'caixa'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <CircleDollarSign className="w-4 h-4" />
              <span>Fluxo de Caixa</span>
            </button>

            <button
              onClick={() => handleNavClick('estoque')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'estoque'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque</span>
            </button>
          </nav>

          {/* Zone 3: Actions (Prompt & Settings) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all whitespace-nowrap shadow-sm"
              title="Copiar prompt pronto para criar este site"
            >
              <FileCode2 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Copiar Prompt</span>
              <span className="sm:hidden">Prompt</span>
            </button>

            <button
              onClick={openSettings}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Configurações & Backup"
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-neutral-300" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-900 px-4 pt-2 pb-4 space-y-1">
          <button
            onClick={() => handleNavClick('pdv')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
              activeTab === 'pdv' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>PDV Balcão</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('fiado')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
              activeTab === 'fiado' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookUser className="w-4 h-4" />
              <span>Caderneta / Fiado</span>
            </div>
            {totalDebtPending > 0 && (
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {formatCurrency(totalDebtPending)}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('caixa')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
              activeTab === 'caixa' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4" />
              <span>Fluxo de Caixa</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('estoque')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
              activeTab === 'estoque' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Estoque de Bebidas & Espetos</span>
            </div>
          </button>
        </div>
      )}
    </header>
  );
};
