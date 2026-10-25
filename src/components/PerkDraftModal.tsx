import React, { useEffect } from 'react';
import { Zap, Shield, Sparkles, Wind, Crosshair, Magnet, HeartPulse, Gauge } from 'lucide-react';
import { PerkOption } from '../game/types';

interface PerkDraftModalProps {
  options: PerkOption[];
  onSelect: (perk: PerkOption) => void;
}

export const PerkDraftModal: React.FC<PerkDraftModalProps> = ({ options, onSelect }) => {
  // Listen for keyboard shortcuts 1, 2, 3
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '1' && options[0]) onSelect(options[0]);
      if (e.key === '2' && options[1]) onSelect(options[1]);
      if (e.key === '3' && options[2]) onSelect(options[2]);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [options, onSelect]);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'legendary':
        return { text: 'LEGENDARY', border: 'border-amber-500/80', bg: 'bg-amber-950/40', textCol: 'text-amber-400' };
      case 'epic':
        return { text: 'EPIC', border: 'border-purple-500/80', bg: 'bg-purple-950/40', textCol: 'text-purple-400' };
      case 'rare':
        return { text: 'RARE', border: 'border-cyan-500/80', bg: 'bg-cyan-950/40', textCol: 'text-cyan-400' };
      default:
        return { text: 'STANDARD', border: 'border-slate-600', bg: 'bg-slate-900/60', textCol: 'text-slate-400' };
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'zap': return <Zap className="w-5 h-5 text-cyan-400" />;
      case 'shield':
      case 'shield-alert': return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'wind': return <Wind className="w-5 h-5 text-sky-400" />;
      case 'crosshair': return <Crosshair className="w-5 h-5 text-amber-400" />;
      case 'magnet': return <Magnet className="w-5 h-5 text-indigo-400" />;
      case 'heart-pulse': return <HeartPulse className="w-5 h-5 text-rose-400" />;
      case 'gauge': return <Gauge className="w-5 h-5 text-cyan-400" />;
      default: return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 select-none animate-in fade-in duration-200">
      <div className="flex flex-col items-center max-w-4xl w-full">
        {/* Modal Header */}
        <div className="text-center mb-6">
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
            QUANTUM SYNTHESIS PROTOCOL
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide mt-1">
            SELECT AUGMENTATION
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Harmonize quantum reactor energy with ship systems
          </p>
        </div>

        {/* 3 Upgrade Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {options.map((perk, idx) => {
            const tierStyle = getTierBadge(perk.tier);
            const isNew = perk.currentLevel === 0;

            return (
              <button
                key={perk.id}
                onClick={() => onSelect(perk)}
                className={`group relative flex flex-col justify-between p-5 rounded-lg border text-left transition-all duration-150 transform hover:-translate-y-1 hover:shadow-xl ${tierStyle.border} ${tierStyle.bg} hover:border-white/80`}
              >
                {/* Hotkey Number Tag */}
                <div className="absolute top-3 right-3 w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  {idx + 1}
                </div>

                <div>
                  {/* Category & Tier Label */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-mono font-bold tracking-wider ${tierStyle.textCol}`}>
                      {tierStyle.text}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {perk.category}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 group-hover:border-cyan-400 transition-colors">
                      {getIcon(perk.icon)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {perk.name}
                      </h3>
                      <div className="text-xs font-mono text-cyan-400">
                        {isNew ? (
                          <span className="text-emerald-400 font-semibold">NEW SYSTEM</span>
                        ) : (
                          <span>Level {perk.currentLevel} → {perk.currentLevel + 1}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    {perk.description}
                  </p>
                </div>

                {/* Bottom Confirmation Action */}
                <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Max: Level {perk.maxLevel}
                  </span>
                  <span className="text-xs font-semibold text-cyan-400 group-hover:text-white transition-colors">
                    Equip →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Shortcut Hint */}
        <div className="mt-6 text-center text-xs font-mono text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">1</kbd>, <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">2</kbd>, or <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">3</kbd> to install
        </div>
      </div>
    </div>
  );
};
