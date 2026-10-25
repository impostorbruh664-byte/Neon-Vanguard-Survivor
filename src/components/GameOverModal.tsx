import React, { useEffect, useState } from 'react';
import { RotateCcw, Trophy, Home, Skull, Clock, Award, ShieldAlert } from 'lucide-react';
import { RunSummary } from '../game/types';

interface GameOverModalProps {
  summary: RunSummary;
  callSign: string;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  callSign,
  onRestart,
  onOpenLeaderboard,
  onTitle
}) => {
  const [submitting, setSubmitting] = useState(true);
  const [submissionResult, setSubmissionResult] = useState<{
    rank?: number;
    isPersonalBest?: boolean;
    highScore?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const submitScore = async () => {
      try {
        const res = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: callSign || 'VanguardPilot',
            score: summary.score,
            wave: summary.wave,
            kills: summary.kills,
            survivalSeconds: summary.survivalSeconds,
            loadout: {
              weapon: summary.weapon,
              perkCount: summary.perksAcquired,
              maxDps: summary.maxDps
            }
          })
        });

        const data = await res.json();
        if (active) {
          if (!res.ok) {
            setSubmissionResult({ error: data.message || data.error || 'Submission failed' });
          } else {
            setSubmissionResult({
              rank: data.rank,
              isPersonalBest: data.isPersonalBest,
              highScore: data.highScore
            });
          }
          setSubmitting(false);
        }
      } catch (err) {
        if (active) {
          setSubmissionResult({ error: 'Network error submitting score' });
          setSubmitting(false);
        }
      }
    };

    submitScore();
    return () => {
      active = false;
    };
  }, [summary, callSign]);

  // Format survival time
  const mins = Math.floor(summary.survivalSeconds / 60);
  const secs = summary.survivalSeconds % 60;
  const timeFormatted = `${mins}m ${secs}s`;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 select-none animate-in fade-in duration-200">
      <div className="flex flex-col items-center max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-xl p-6 shadow-2xl">
        {/* Banner */}
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest text-rose-400 uppercase">
            HULL BREACH DETECTED
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
          MISSION DEBRIEF
        </h2>
        <span className="text-xs font-mono text-slate-400 mb-6">
          CALL-SIGN: <span className="text-cyan-400 font-bold">{callSign || 'VanguardPilot'}</span>
        </span>

        {/* Primary Score Callout */}
        <div className="w-full bg-slate-950/80 border border-cyan-500/30 rounded-lg p-4 text-center mb-5">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
            FINAL SCORE ACHIEVED
          </span>
          <span className="text-3xl md:text-4xl font-extrabold font-mono text-cyan-300 tracking-tight tabular-nums block">
            {summary.score.toLocaleString()}
          </span>

          {/* Submission status feedback */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-center text-xs">
            {submitting ? (
              <span className="text-slate-400 font-mono animate-pulse">
                Transmitting telemetry to Galactic Roster...
              </span>
            ) : submissionResult?.error ? (
              <div className="flex items-center gap-1.5 text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{submissionResult.error}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-300 font-mono">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  RANK #{submissionResult?.rank} ON LEADERBOARD
                </span>
                {submissionResult?.isPersonalBest && (
                  <span className="text-emerald-400 font-bold ml-1">★ PERSONAL BEST</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-6">
          <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Wave</span>
            <span className="text-lg font-bold text-white font-mono tabular-nums">
              {summary.wave}
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-mono mb-0.5">
              <Skull className="w-2.5 h-2.5 text-rose-400" />
              <span>Kills</span>
            </div>
            <span className="text-lg font-bold text-white font-mono tabular-nums">
              {summary.kills}
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-mono mb-0.5">
              <Clock className="w-2.5 h-2.5 text-cyan-400" />
              <span>Survived</span>
            </div>
            <span className="text-base font-bold text-white font-mono tabular-nums">
              {timeFormatted}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] transform hover:scale-[1.01]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>DEPLOY AGAIN (SPACE)</span>
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-amber-300 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={onTitle}
              className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Title Base</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
