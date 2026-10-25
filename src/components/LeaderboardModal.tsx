import React, { useEffect, useState } from 'react';
import { X, Trophy, Search, RefreshCw, Crown, ShieldAlert, Zap, Flame } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  playerId: string;
  username: string;
  rank: number;
  score: number;
  wave: number;
  kills: number;
  survivalSeconds: number;
  loadout: {
    weapon: string;
    perkCount: number;
    maxDps: number;
  };
  timestamp: string;
  verified: boolean;
  flagged?: boolean;
}

interface LeaderboardModalProps {
  onClose: () => void;
  currentCallSign: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, currentCallSign }) => {
  const [timeframe, setTimeframe] = useState<'all-time' | 'weekly' | 'today'>('all-time');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModifier, setActiveModifier] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?timeframe=${timeframe}`);
      const data = await res.json();
      setEntries(data.leaderboard || []);
      setActiveModifier(data.activeModifier);
      setBroadcast(data.broadcast);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  // Filter by search
  const filtered = entries.filter((e) =>
    e.username.toLowerCase().includes(search.toLowerCase().trim())
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center gap-1 text-amber-400 font-bold font-mono">
          <Crown className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>#1 GM</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center gap-1 text-slate-200 font-bold font-mono">
          <Crown className="w-4 h-4 fill-slate-300 text-slate-300" />
          <span>#2</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center gap-1 text-amber-600 font-bold font-mono">
          <Crown className="w-4 h-4 fill-amber-700 text-amber-700" />
          <span>#3</span>
        </div>
      );
    }
    if (rank <= 10) {
      return <span className="font-mono text-cyan-400 font-semibold">#{rank}</span>;
    }
    return <span className="font-mono text-slate-400">#{rank}</span>;
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 select-none animate-in fade-in duration-150">
      <div className="flex flex-col max-w-4xl w-full h-[90vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  GALACTIC PILOT LEADERBOARD
                </h2>
                {activeModifier && (
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-cyan-400" />
                    <span>MODIFIER: {activeModifier}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Verified pilot records, anti-cheat validated in real-time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Broadcast alert bar if present */}
        {broadcast && (
          <div className="px-6 py-2 bg-slate-800/60 border-b border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400 shrink-0">FLEET DISPATCH:</span>
            <span className="truncate">{broadcast}</span>
          </div>
        )}

        {/* Toolbar: Timeframe Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-slate-800 bg-slate-950/50">
          {/* Segmented Timeframe Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setTimeframe('all-time')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                timeframe === 'all-time'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All-Time Legends
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                timeframe === 'weekly'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly Circuit
            </button>
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                timeframe === 'today'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily Sorties
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search call-sign..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <button
              onClick={fetchLeaderboard}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
              <span>Querying orbital flight logs...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-mono text-xs">
              <ShieldAlert className="w-8 h-8 text-slate-600 mb-2" />
              <span>No pilot records matched your search parameters.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Call-Sign</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-center">Wave</th>
                  <th className="py-2.5 px-3 text-center">Kills</th>
                  <th className="py-2.5 px-3 text-center">Duration</th>
                  <th className="py-2.5 px-3">Primary Weapon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filtered.map((item) => {
                  const isCurrent =
                    currentCallSign &&
                    item.username.toLowerCase() === currentCallSign.toLowerCase();

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-cyan-950/30 border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getRankBadge(item.rank)}
                      </td>

                      {/* Pilot Call-Sign */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isCurrent ? 'text-cyan-300' : 'text-slate-200'}`}>
                            {item.username}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded font-sans font-semibold">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-cyan-300 whitespace-nowrap">
                        {item.score.toLocaleString()}
                      </td>

                      {/* Wave */}
                      <td className="py-3 px-3 text-center tabular-nums text-slate-300 whitespace-nowrap">
                        {item.wave}
                      </td>

                      {/* Kills */}
                      <td className="py-3 px-3 text-center tabular-nums text-slate-300 whitespace-nowrap">
                        {item.kills.toLocaleString()}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 text-center tabular-nums text-slate-400 whitespace-nowrap">
                        {formatTime(item.survivalSeconds)}
                      </td>

                      {/* Weapon */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span className="truncate max-w-[120px]">{item.loadout?.weapon || 'Hyper Blaster'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div>
            Showing {filtered.length} of {entries.length} registered pilot sorties
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Anti-Cheat Real-Time Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
