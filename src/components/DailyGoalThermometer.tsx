import React, { useState } from 'react';
import { DailyGoalSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Target, CheckCircle2, Flame, Edit2, X, Check } from 'lucide-react';

interface DailyGoalThermometerProps {
  todayProfit: number;
  goals: DailyGoalSettings;
  onUpdateGoals: (goals: DailyGoalSettings) => void;
  variant?: 'compact' | 'expanded';
}

export const DailyGoalThermometer: React.FC<DailyGoalThermometerProps> = ({
  todayProfit,
  goals,
  onUpdateGoals,
  variant = 'compact',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fixedInput, setFixedInput] = useState(goals.dailyFixedCost.toString());
  const [targetInput, setTargetInput] = useState(goals.dailyProfitTarget.toString());

  const fixedCost = Math.max(0, goals.dailyFixedCost);
  const profitTarget = Math.max(1, goals.dailyProfitTarget);
  const totalDayNeeded = fixedCost + profitTarget;

  const netAfterFixed = todayProfit - fixedCost;
  const fixedCoveredPct = fixedCost > 0 ? Math.min(100, Math.max(0, (todayProfit / fixedCost) * 100)) : 100;
  const goalPct =
    netAfterFixed > 0
      ? Math.min(100, Math.max(0, (netAfterFixed / profitTarget) * 100))
      : 0;
  const overallPct = Math.min(100, Math.max(0, (todayProfit / totalDayNeeded) * 100));

  const brokeEven = todayProfit >= fixedCost;
  const hitGoal = netAfterFixed >= profitTarget;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const f = Math.max(0, parseFloat(fixedInput.replace(',', '.')) || 0);
    const t = Math.max(10, parseFloat(targetInput.replace(',', '.')) || 100);
    onUpdateGoals({ dailyFixedCost: f, dailyProfitTarget: t });
    setIsEditing(false);
  };

  if (variant === 'compact') {
    return (
      <div className="bg-neutral-900/40 border-b border-neutral-800/70 px-4 py-1.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            {hitGoal ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : brokeEven ? (
              <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            )}
            <span className="text-neutral-300 truncate">
              {hitGoal ? (
                <>
                  Meta batida! <strong className="text-emerald-400 font-mono">{formatCurrency(netAfterFixed)}</strong> livres no bolso hoje
                </>
              ) : brokeEven ? (
                <>
                  Custos do dia pagos! Lucro limpo:{' '}
                  <strong className="text-emerald-400 font-mono">{formatCurrency(netAfterFixed)}</strong> de{' '}
                  <span className="font-mono text-neutral-400">{formatCurrency(profitTarget)}</span>
                </>
              ) : (
                <>
                  Ponto de equilíbrio:{' '}
                  <strong className="text-amber-400 font-mono">{formatCurrency(Math.max(0, todayProfit))}</strong> /{' '}
                  <span className="font-mono text-neutral-400">{formatCurrency(fixedCost)}</span> para pagar custos fixos do dia
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-48">
            <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  hitGoal
                    ? 'bg-emerald-400'
                    : brokeEven
                    ? 'bg-amber-400'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <span className="font-mono font-bold text-neutral-400 tabular-nums shrink-0">
              {overallPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view for CashFlowView
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Termômetro do Dia: Ponto de Equilíbrio & Meta de Lucro</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Primeiro o sistema cobre o custo fixo diário (gás, carvão, energia, gelo, seu tempo) e depois mostra o lucro limpo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFixedInput(goals.dailyFixedCost.toString());
            setTargetInput(goals.dailyProfitTarget.toString());
            setIsEditing((v) => !v);
          }}
          className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
        >
          {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          <span>{isEditing ? 'Fechar' : 'Ajustar Metas'}</span>
        </button>
      </div>

      {isEditing && (
        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-950 border border-neutral-800 rounded-xl p-3"
        >
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">
              Custo Fixo / Dia (Gás, Luz, Carvão, Tempo)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={fixedInput}
              onChange={(e) => setFixedInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">
              Meta de Lucro Limpo / Noite (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Meta
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">1. Custos Fixos do Dia</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              {formatCurrency(Math.min(fixedCost, Math.max(0, todayProfit)))} / {formatCurrency(fixedCost)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                brokeEven ? 'bg-emerald-400' : 'bg-orange-500'
              }`}
              style={{ width: `${fixedCoveredPct}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-500">
            {brokeEven
              ? 'Operação do dia já está paga!'
              : `Faltam ${formatCurrency(Math.max(0, fixedCost - todayProfit))} de margem para empatar os custos de hoje.`}
          </p>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">2. Meta de Lucro Limpo</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                netAfterFixed >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(Math.max(0, netAfterFixed))} / {formatCurrency(profitTarget)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-500">
            {hitGoal
              ? `Meta superada em ${formatCurrency(netAfterFixed - profitTarget)}!`
              : brokeEven
              ? `Faltam ${formatCurrency(Math.max(0, profitTarget - netAfterFixed))} para bater sua meta da noite.`
              : 'Começa a encher assim que os custos fixos do dia forem cobertos.'}
          </p>
        </div>
      </div>
    </div>
  );
};
