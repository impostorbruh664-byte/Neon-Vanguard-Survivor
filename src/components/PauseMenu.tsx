import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../game/audio';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onTitle,
  isMuted,
  onToggleMute
}) => {
  const [vol, setVol] = React.useState(sound.getVolume());

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    sound.setVolume(v);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 select-none animate-in fade-in duration-150">
      <div className="flex flex-col items-center max-w-sm w-full bg-slate-900 border border-slate-700/80 rounded-xl p-6 shadow-2xl">
        <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
          TACTICAL HOLD
        </span>
        <h2 className="text-2xl font-bold text-white mt-1 mb-6">
          SIMULATION PAUSED
        </h2>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full mb-6">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase rounded-lg transition-colors shadow-md"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME MISSION</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs tracking-wider uppercase rounded-lg border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART SORTIE</span>
          </button>

          <button
            onClick={onTitle}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs tracking-wider uppercase rounded-lg border border-slate-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>ABORT TO TITLE</span>
          </button>
        </div>

        {/* Audio Controls */}
        <div className="w-full pt-4 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">SYNTH MASTER VOLUME</span>
            <span className="font-mono tabular-nums">{Math.round(vol * 100)}%</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMute}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={vol}
              onChange={handleVolumeChange}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Shortcuts reminder */}
        <div className="mt-4 text-[11px] font-mono text-slate-500 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd> to resume
        </div>
      </div>
    </div>
  );
};
