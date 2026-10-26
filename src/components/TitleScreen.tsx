import React from 'react';
import { Volume2, VolumeX, Trophy, ShieldAlert, Play, Crosshair, Users } from 'lucide-react';
import { sound } from '../game/audio';
import { WeaponType } from '../game/types';

interface TitleScreenProps {
  onStart: (weapon: WeaponType) => void;
  onOpenMultiplayer: (weapon: WeaponType) => void;
  onOpenLeaderboard: () => void;
  onOpenAdmin: () => void;
  callSign: string;
  onCallSignChange: (val: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeBroadcast?: string | null;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenMultiplayer,
  onOpenLeaderboard,
  onOpenAdmin,
  callSign,
  onCallSignChange,
  isMuted,
  onToggleMute,
  activeBroadcast
}) => {
  const [selectedWeapon, setSelectedWeapon] = React.useState<WeaponType>('Hyper Blaster');

  const weapons: { type: WeaponType; label: string; desc: string }[] = [
    { type: 'Hyper Blaster', label: 'Hyper Blaster', desc: 'Rapid kinetic plasma pulse' },
    { type: 'Plasma Burst', label: 'Plasma Burst', desc: 'Heavy high-explosive area cannon' },
    { type: 'Tesla Arc', label: 'Tesla Arc', desc: 'Continuous chaining electric shock' },
    { type: 'Orbital Blades', label: 'Orbital Blades', desc: 'Rotating defensive photon cutters' }
  ];

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none z-10">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
            Orbital Defense Fleet · Sector 7
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          <button
            onClick={() => onOpenMultiplayer(selectedWeapon)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/50 rounded-md shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Multiplayer Squads</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-600/50 rounded-md transition-colors"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors"
          >
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span>Admin Console</span>
          </button>
        </div>
      </div>

      {/* Broadcast Flash if active */}
      {activeBroadcast && (
        <div className="w-full max-w-2xl mx-auto my-2 pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/90 border border-cyan-500/30 rounded-lg text-xs text-cyan-200">
            <span className="font-bold text-cyan-400 shrink-0">COMMAND BROADCAST:</span>
            <span className="truncate">{activeBroadcast}</span>
          </div>
        </div>
      )}

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center pointer-events-auto max-w-3xl mx-auto w-full">
        <div className="mb-4">
          <svg
            viewBox="0 0 680 120"
            className="w-full max-w-xl mx-auto drop-shadow-[0_0_25px_rgba(56,189,248,0.35)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Hexagon Crest */}
            <polygon points="340,6 360,18 360,40 340,52 320,40 320,18" stroke="#38bdf8" strokeWidth="2" fill="rgba(15,23,42,0.6)" />
            <polygon points="340,14 353,22 353,36 340,44 327,36 327,22" fill="#38bdf8" opacity="0.4" />
            
            {/* Text Lockup */}
            <text
              x="340"
              y="90"
              textAnchor="middle"
              className="font-black text-5xl tracking-widest fill-white"
              style={{
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '0.22em',
                fontWeight: 900
              }}
            >
              NEON VANGUARD
            </text>
            <text
              x="340"
              y="114"
              textAnchor="middle"
              className="text-xs font-semibold fill-cyan-400 tracking-widest"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.45em'
              }}
            >
              SURVIVOR ROGUELITE · ZERO LATENCY
            </text>
          </svg>
        </div>

        <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
          Repel swarms of rogue void drones, harvest quantum energy cores, draft devastating weapon augmentations, and fight for the top of the galactic leaderboard.
        </p>

        {/* Pilot Call-Sign Setup */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mb-6">
          <div className="relative w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-cyan-400">CALL-SIGN:</span>
            <input
              type="text"
              value={callSign}
              maxLength={20}
              onChange={(e) => onCallSignChange(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder="PilotCallSign"
              className="w-full pl-28 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-lg text-sm text-white font-mono outline-none transition-colors"
            />
          </div>
        </div>

        {/* Loadout Selection */}
        <div className="w-full max-w-xl mb-8">
          <div className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider text-left">
            Select Starting Ordinance
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {weapons.map((w) => (
              <button
                key={w.type}
                onClick={() => setSelectedWeapon(w.type)}
                className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                  selectedWeapon === w.type
                    ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Crosshair className={`w-3.5 h-3.5 ${selectedWeapon === w.type ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-semibold whitespace-nowrap">{w.label}</span>
                </div>
                <span className="text-[11px] leading-tight text-slate-500">{w.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Start Game CTA */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => onStart(selectedWeapon)}
              className="group relative flex items-center justify-center gap-3 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wider uppercase rounded-lg shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current transition-transform group-hover:translate-x-0.5" />
              <span>DEPLOY SOLO SORTIE</span>
            </button>

            <button
              onClick={() => onOpenMultiplayer(selectedWeapon)}
              className="group relative flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/60 font-bold text-sm tracking-wider uppercase rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>MULTIPLAYER SQUADS</span>
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Enter</kbd> to launch solo
          </span>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span>WASD / Arrows to Move</span>
          <span aria-hidden="true">·</span>
          <span>Mouse to Aim</span>
          <span aria-hidden="true">·</span>
          <span>Space to Warp Dash</span>
          <span aria-hidden="true">·</span>
          <span>Esc to Pause</span>
        </div>
        <div className="mt-2 sm:mt-0 font-mono text-[11px] text-slate-600">
          VANGUARD OS v2.6 · 60 FPS SIMULATION
        </div>
      </div>
    </div>
  );
};
