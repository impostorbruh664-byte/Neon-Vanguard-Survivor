import React from 'react';
import { Shield, Zap, Pause, Volume2, VolumeX, Crosshair, Skull, Clock } from 'lucide-react';
import { PlayerStats } from '../game/types';

interface GameHUDProps {
  stats: PlayerStats;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ stats, onPause, isMuted, onToggleMute }) => {
  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const xpPercent = Math.max(0, Math.min(100, (stats.xp / stats.xpToNext) * 100));

  // Format survival time mm:ss
  const mins = Math.floor(stats.timeSeconds / 60);
  const secs = stats.timeSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter HUD Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Hull Integrity & Level XP */}
        <div className="flex flex-col gap-2 min-w-[200px] md:min-w-[260px]">
          {/* Hull Bar */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-md p-2">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <div className="flex items-center gap-1.5 text-rose-400">
                <Shield className="w-3.5 h-3.5" />
                <span>HULL INTEGRITY</span>
              </div>
              <span className="font-mono tabular-nums text-slate-200">
                {stats.hp} / {stats.maxHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden p-0.5">
              <div
                className={`h-full rounded-xs transition-all duration-150 ${
                  hpPercent > 50 ? 'bg-emerald-400' : hpPercent > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Level & XP Bar */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-md p-2">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-cyan-400 font-mono">LEVEL {stats.level}</span>
              <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                {stats.xp} / {stats.xpToNext} XP
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-100"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Center: Survival Clock & Current Wave */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-md">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono tabular-nums text-sm font-bold">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{timeFormatted}</span>
            </div>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-bold text-amber-400 tracking-wider uppercase font-mono">
              WAVE {stats.wave.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

          {/* Top-Right: Score, Kills & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Cheat Badges */}
            <div className="hidden md:flex items-center gap-1.5 pointer-events-auto">
              {stats.cheats?.godMode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
                  ★ GOD MODE
                </span>
              )}
              {stats.cheats?.hyperOverclock && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                  ★ OVERCLOCK
                </span>
              )}
              {stats.cheats?.infiniteMagnet && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  ★ VORTEX
                </span>
              )}
            </div>

            {/* Score & Kills Cluster */}
            <div className="flex items-center gap-4 px-3.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-md">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">SCORE</span>
                <span className="font-mono tabular-nums text-sm font-bold text-cyan-300">
                  {stats.score.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div className="flex items-center gap-1.5 text-rose-400">
                <Skull className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums text-sm font-bold text-slate-200">
                  {stats.kills}
                </span>
              </div>
            </div>

            {/* Interactive Action Buttons */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={onToggleMute}
                className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-md text-slate-300 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
              <button
                onClick={onPause}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-md text-slate-300 hover:text-white transition-colors text-xs font-mono"
              >
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ESC</span>
              </button>
            </div>
          </div>
      </div>

      {/* Bottom Perimeter HUD Cluster */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Active Weapons & Perks Loadout */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-900/90 border border-slate-700/80 rounded-md max-w-md overflow-x-auto">
          {stats.activePerks.map((perk) => (
            <div
              key={perk.id}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 border border-slate-700 rounded text-xs"
              title={`${perk.name} (Lvl ${perk.currentLevel})`}
            >
              <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="font-medium text-slate-200 truncate max-w-[90px]">{perk.name}</span>
              <span className="font-mono text-[10px] text-cyan-400 ml-0.5">L{perk.currentLevel}</span>
            </div>
          ))}
          {stats.activePerks.length === 0 && (
            <span className="text-xs text-slate-500 font-mono">Standard Rig</span>
          )}
        </div>

        {/* Bottom-Right: Warp Dash Readiness */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-md">
          <Crosshair className={`w-4 h-4 ${stats.dashReady ? 'text-cyan-400' : 'text-slate-600'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 tracking-wider">WARP DASH [SPACE]</span>
            <span
              className={`font-mono text-xs font-bold ${
                stats.dashReady ? 'text-emerald-400' : 'text-slate-500 tabular-nums'
              }`}
            >
              {stats.dashReady ? 'READY' : `${stats.dashCooldown.toFixed(1)}s`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
