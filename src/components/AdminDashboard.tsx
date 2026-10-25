import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Users,
  BarChart3,
  Flame,
  Search,
  Ban,
  UserCheck,
  Trash2,
  Send,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Lock,
  X,
  RefreshCw,
  LogOut,
  ChevronRight,
  Crown,
  Zap,
  Sparkles,
  Bomb,
  HeartPulse,
  Wand2,
  FastForward,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { NeonEngine } from '../game/engine';

interface PlayerRecord {
  id: string;
  username: string;
  ip: string;
  status: 'active' | 'warned' | 'banned';
  banReason?: string;
  bannedAt?: string;
  totalRuns: number;
  highScore: number;
  highestWave: number;
  totalKills: number;
  totalPlaytimeSeconds: number;
  anomalyScore: number;
  flaggedForReview: boolean;
  createdAt: string;
  lastActive: string;
  favoriteWeapon: string;
}

interface AdminStats {
  summary: {
    totalPlayers: number;
    activePlayers: number;
    bannedPlayers: number;
    flaggedPlayers: number;
    totalRuns: number;
    totalKills: number;
    avgSurvivalTime: number;
    totalPlaytimeHours: string;
  };
  weaponMeta: Record<string, number>;
  activeModifiers: {
    id: string;
    name: string;
    description: string;
    active: boolean;
    type: string;
  }[];
  broadcast: string;
  recentLogs: {
    id: string;
    timestamp: string;
    action: string;
    target: string;
    details: string;
    adminEmail: string;
  }[];
}

interface AdminDashboardProps {
  onClose: () => void;
  engine?: NeonEngine | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, engine }) => {
  // Authentication state
  const OWNER_EMAIL = 'aliuq1125@gmail.com';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('nv_admin_auth') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Tab State
  const [currentTab, setCurrentTab] = useState<'overview' | 'cheats' | 'players' | 'modifiers' | 'logs'>('overview');

  // Cheat toggle reactive state
  const [cheatState, setCheatState] = useState({
    godMode: engine?.godMode || false,
    infiniteDash: engine?.infiniteDash || false,
    hyperOverclock: engine?.hyperOverclock || false,
    infiniteMagnet: engine?.infiniteMagnet || false
  });

  // Dashboard Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<'all' | 'flagged' | 'banned' | 'active'>('all');
  const [playerSearch, setPlayerSearch] = useState('');

  // Action states
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRecord | null>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('Impossible score telemetry & speed manipulation');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Authenticate Admin
  const handleAuth = (useOwner = false) => {
    if (useOwner || passcode === 'admin2026') {
      setIsAuthenticated(true);
      localStorage.setItem('nv_admin_auth', 'true');
      setAuthError('');
      fetchDashboardData();
    } else {
      setAuthError('Invalid admin passcode. Use owner credentials or "admin2026"');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('nv_admin_auth');
  };

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-admin-email': OWNER_EMAIL,
      'x-admin-key': 'admin2026'
    };
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [statsRes, playersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch(`/api/admin/players?filter=${playerFilter}&search=${encodeURIComponent(playerSearch)}`, { headers })
      ]);

      if (statsRes.ok && playersRes.ok) {
        const statsData = await statsRes.json();
        const playersData = await playersRes.json();
        setStats(statsData);
        setPlayers(playersData.players || []);
        if (statsData.broadcast && !broadcastInput) {
          setBroadcastInput(statsData.broadcast);
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, playerFilter, playerSearch]);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4500);
  };

  // Admin In-Game Cheat Handlers
  const handleToggleCheat = (type: 'godMode' | 'infiniteDash' | 'hyperOverclock' | 'infiniteMagnet') => {
    if (!engine) {
      showNotification('Notice: Engine active run required to bind live cheats. Deploy to apply in real-time.');
      return;
    }
    let val = false;
    if (type === 'godMode') val = engine.toggleGodMode();
    else if (type === 'infiniteDash') val = engine.toggleInfiniteDash();
    else if (type === 'hyperOverclock') val = engine.toggleHyperOverclock();
    else if (type === 'infiniteMagnet') val = engine.toggleInfiniteMagnet();

    setCheatState((prev) => ({ ...prev, [type]: val }));
    showNotification(`Cheat ${type.toUpperCase()}: ${val ? 'ACTIVATED' : 'DEACTIVATED'}`);
  };

  const handleScreenNuke = () => {
    if (!engine) {
      showNotification('Notice: Deploy a run to trigger Ion Screen Nuke.');
      return;
    }
    engine.triggerScreenNuke();
    showNotification('Tactical Ion Nuke deployed: All enemy swarms vaporized!');
  };

  const handleMaxAllPerks = () => {
    if (!engine) {
      showNotification('Notice: Deploy a run to max perks.');
      return;
    }
    engine.maxAllPerks();
    showNotification('All primary & secondary weapons and tech trees maxed out!');
  };

  const handleAddLevels = (count = 3) => {
    if (!engine) {
      showNotification('Notice: Deploy a run to grant levels.');
      return;
    }
    engine.addInstantLevels(count);
    showNotification(`Granted +${count} instant levels & full hull repair!`);
  };

  const handleFullHeal = () => {
    if (!engine) {
      showNotification('Notice: Deploy a run to repair hull.');
      return;
    }
    engine.fullHeal();
    showNotification('Hull repaired to 100% and 3 Aegis Shield barriers energized!');
  };

  const handleAdvanceWave = () => {
    if (!engine) {
      showNotification('Notice: Deploy a run to advance wave.');
      return;
    }
    engine.advanceWave(1);
    showNotification('Sector escalated: Advanced to next wave!');
  };

  const handleSpawnBoss = () => {
    if (!engine) {
      showNotification('Notice: Deploy a run to summon boss.');
      return;
    }
    engine.spawnInstantBoss();
    showNotification('Warning: Omega Colossus Titan summoned to sector!');
  };

  // Ban User
  const confirmBan = async () => {
    if (!selectedPlayer) return;
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          username: selectedPlayer.username,
          reason: banReason
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Pilot ${selectedPlayer.username} banned & purged from leaderboards.`);
        setBanModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Unban User
  const handleUnban = async (player: PlayerRecord) => {
    try {
      const res = await fetch('/api/admin/unban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          playerId: player.id,
          username: player.username
        })
      });
      if (res.ok) {
        showNotification(`Pilot ${player.username} restored to active status.`);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Global Modifier
  const handleToggleModifier = async (modifierId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/modifier', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          modifierId,
          active: !currentActive
        })
      });
      if (res.ok) {
        showNotification('System modifier state updated across all pilot instances.');
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Broadcast Alert
  const handleSendBroadcast = async () => {
    if (!broadcastInput.trim()) return;
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: broadcastInput })
      });
      if (res.ok) {
        showNotification('Global Fleet Dispatch transmitted to all active cockpits.');
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 select-none animate-in fade-in">
        <div className="flex flex-col items-center max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-xl p-6 shadow-2xl">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-3">
            <Lock className="w-6 h-6 text-indigo-400" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-wide">
            FLEET COMMAND ADMIN
          </h2>
          <p className="text-xs text-slate-400 text-center mt-1 mb-6">
            Restricted to project administrator and authorized moderation officers.
          </p>

          {/* Owner 1-Click Fast Track */}
          <div className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-3.5 mb-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-indigo-300">Recognized Owner:</span>
              <span className="font-mono text-cyan-400 font-bold">{OWNER_EMAIL}</span>
            </div>
            <button
              onClick={() => handleAuth(true)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wider uppercase rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Authorize as Owner (1-Click)</span>
            </button>
          </div>

          {/* Alternative Passcode Field */}
          <div className="w-full pt-3 border-t border-slate-800">
            <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase">
              Or Enter Master Key:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Key (e.g. admin2026)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth(false)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={() => handleAuth(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Unlock
              </button>
            </div>
            {authError && <p className="text-xs text-rose-400 mt-2">{authError}</p>}
          </div>

          <button
            onClick={onClose}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Return to Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/90 select-none animate-in fade-in duration-150">
      <div className="flex flex-col max-w-6xl w-full h-[94vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Top Command Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide">
                  VANGUARD COMMAND CONSOLE
                </h1>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                  SUPER ADMIN: {OWNER_EMAIL}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time player telemetry, automated anti-cheat moderation, and live simulation tuning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
              title="Lock Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Close Console"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {actionSuccessMsg && (
          <div className="px-6 py-2 bg-emerald-950/80 border-b border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setCurrentTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Telemetry Overview</span>
          </button>

          <button
            onClick={() => setCurrentTab('cheats')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'cheats'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Cheats & God Tools</span>
          </button>

          <button
            onClick={() => setCurrentTab('players')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'players'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pilots & Moderation</span>
            {stats?.summary.flaggedPlayers ? (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded font-mono">
                {stats.summary.flaggedPlayers}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setCurrentTab('modifiers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'modifiers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Arena Modifiers & Broadcast</span>
          </button>

          <button
            onClick={() => setCurrentTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          {/* TAB 1: OVERVIEW */}
          {currentTab === 'overview' && stats && (
            <div className="flex flex-col gap-6">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                    Registered Pilots
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white tabular-nums">
                      {stats.summary.totalPlayers}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">
                      {stats.summary.activePlayers} Active
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                    Total Battles Logged
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
                      {stats.summary.totalRuns}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Sorties</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                    Total Swarm Kills
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
                      {stats.summary.totalKills.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                    Enforcement Status
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                      {stats.summary.bannedPlayers}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Banned Cheaters</span>
                  </div>
                </div>
              </div>

              {/* Anti-Cheat Anomaly Spotlight */}
              {stats.summary.flaggedPlayers > 0 && (
                <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-rose-400 text-xs font-bold font-mono">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>ANTI-CHEAT ANOMALIES DETECTED ({stats.summary.flaggedPlayers} ACCOUNTS)</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    Automated heuristic telemetry has flagged accounts submitting mathematically impossible scores, zero-kill wave progression, or abnormal memory edits.
                  </p>
                  <button
                    onClick={() => {
                      setPlayerFilter('flagged');
                      setCurrentTab('players');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold transition-colors"
                  >
                    <span>Inspect Flagged Accounts</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Weapon Meta Breakdown & Flight Times */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <h3 className="text-xs font-bold font-mono uppercase text-slate-300 mb-3">
                    Weapons Meta Distribution
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {Object.entries(stats.weaponMeta).map(([weapon, count]) => {
                      const pct = Math.round((count / Math.max(1, stats.summary.totalRuns)) * 100);
                      return (
                        <div key={weapon}>
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-slate-300">{weapon}</span>
                            <span className="text-cyan-400 tabular-nums">{count} runs ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-mono uppercase text-slate-300 mb-3">
                      Average Sortie Duration
                    </h3>
                    <div className="text-3xl font-extrabold font-mono text-white mb-2 tabular-nums">
                      {Math.floor(stats.summary.avgSurvivalTime / 60)}m {stats.summary.avgSurvivalTime % 60}s
                    </div>
                    <p className="text-xs text-slate-400">
                      Pilots have accumulated over <span className="font-mono text-cyan-300 font-bold">{stats.summary.totalPlaytimeHours} hours</span> of continuous deep space combat across all sectors.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Database Status: HEALTHY</span>
                    <span className="text-emerald-400">Zero In-Memory Latency</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GAME CHEATS & GOD TOOLS */}
          {currentTab === 'cheats' && (
            <div className="flex flex-col gap-6">
              {/* Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/40 rounded-xl">
                <div className="flex items-center gap-2 mb-1 text-amber-400 text-xs font-bold font-mono">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>ADMINISTRATOR COMBAT OVERRIDE MATRIX</span>
                </div>
                <p className="text-xs text-slate-300">
                  Real-time engine cheats and sandbox controls. Toggling these states directly alters simulation physics, collision detection, and weapon discharge rates for your pilot in real time.
                </p>
              </div>

              {/* 4 Core Persistent Cheat Toggles */}
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-300 mb-3 flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Real-Time Gameplay Toggles</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Cheat 1: God Mode */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      cheatState.godMode
                        ? 'bg-amber-950/40 border-amber-500/60 shadow-lg'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Crown className={`w-4 h-4 ${cheatState.godMode ? 'text-amber-400' : 'text-slate-500'}`} />
                        <h4 className="text-sm font-bold text-white">God Mode (Invulnerability)</h4>
                      </div>
                      <button
                        onClick={() => handleToggleCheat('godMode')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          cheatState.godMode
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cheatState.godMode ? 'ACTIVE [ON]' : 'ENABLE [G]'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nullifies 100% of all incoming collision and projectile damage. Projects a golden divine celestial aura around your fighter.
                    </p>
                  </div>

                  {/* Cheat 2: Zero CD Warp Dash */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      cheatState.infiniteDash
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FastForward className={`w-4 h-4 ${cheatState.infiniteDash ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <h4 className="text-sm font-bold text-white">Infinite Warp Dash</h4>
                      </div>
                      <button
                        onClick={() => handleToggleCheat('infiniteDash')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          cheatState.infiniteDash
                            ? 'bg-cyan-400 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cheatState.infiniteDash ? 'ACTIVE [ON]' : 'ENABLE'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Completely eliminates dash cooldown. Chain invulnerable warp blinks continuously across the sector with zero delay.
                    </p>
                  </div>

                  {/* Cheat 3: Hyper Overclock */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      cheatState.hyperOverclock
                        ? 'bg-rose-950/40 border-rose-500/60 shadow-lg'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Flame className={`w-4 h-4 ${cheatState.hyperOverclock ? 'text-rose-400' : 'text-slate-500'}`} />
                        <h4 className="text-sm font-bold text-white">Hyper Overclock</h4>
                      </div>
                      <button
                        onClick={() => handleToggleCheat('hyperOverclock')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          cheatState.hyperOverclock
                            ? 'bg-rose-500 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cheatState.hyperOverclock ? 'ACTIVE [ON]' : 'ENABLE [O]'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Quadruples weapon rate of fire (4.5x faster discharge) and forces 100% Critical Strike probability on every projectile.
                    </p>
                  </div>

                  {/* Cheat 4: Graviton Vortex */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      cheatState.infiniteMagnet
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-lg'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Compass className={`w-4 h-4 ${cheatState.infiniteMagnet ? 'text-purple-400' : 'text-slate-500'}`} />
                        <h4 className="text-sm font-bold text-white">Graviton Vortex Magnet</h4>
                      </div>
                      <button
                        onClick={() => handleToggleCheat('infiniteMagnet')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          cheatState.infiniteMagnet
                            ? 'bg-purple-500 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cheatState.infiniteMagnet ? 'ACTIVE [ON]' : 'ENABLE [M]'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Expands energy crystal vacuum radius across the entire universe. Every dropped energy gem rushes directly into your ship.
                    </p>
                  </div>
                </div>
              </div>

              {/* Instant Tactical Operations */}
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-300 mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Instant Tactical Operations</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleScreenNuke}
                    className="flex flex-col p-3.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1 text-rose-400 font-bold text-xs">
                      <Bomb className="w-4 h-4" />
                      <span>Tactical Ion Nuke</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Vaporizes all active swarms on screen in a shockwave [N]
                    </span>
                  </button>

                  <button
                    onClick={handleMaxAllPerks}
                    className="flex flex-col p-3.5 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1 text-purple-400 font-bold text-xs">
                      <Wand2 className="w-4 h-4" />
                      <span>Max All Weapons & Tech</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Instantly equips all 4 weapons & 7 passives at Level 5
                    </span>
                  </button>

                  <button
                    onClick={() => handleAddLevels(3)}
                    className="flex flex-col p-3.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1 text-emerald-400 font-bold text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>Level Boost (+3 Levels)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Awards quantum XP, score bonuses, and level increases [L]
                    </span>
                  </button>

                  <button
                    onClick={handleFullHeal}
                    className="flex flex-col p-3.5 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/40 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1 text-sky-400 font-bold text-xs">
                      <HeartPulse className="w-4 h-4" />
                      <span>Full Repair & Shields</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Repairs hull to 100% and charges 3 Aegis Shield barriers [H]
                    </span>
                  </button>

                  <button
                    onClick={handleAdvanceWave}
                    className="flex flex-col p-3.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1 text-amber-400 font-bold text-xs">
                      <FastForward className="w-4 h-4" />
                      <span>Advance to Next Wave</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Instantly jumps sector difficulty forward by 1 wave
                    </span>
                  </button>

                  <button
                    onClick={handleSpawnBoss}
                    className="flex flex-col p-3.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1 text-red-400 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Summon Colossus Boss</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Forces an Omega Colossus Titan dreadnought to spawn
                    </span>
                  </button>
                </div>
              </div>

              {/* In-Game Hotkeys Reference Card */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 mb-2">
                  <span>IN-GAME ACTIVE KEYBOARD SHORTCUTS</span>
                  <span className="text-emerald-400">HOTKEYS ENABLED</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">G</kbd>
                    <span>Toggle God Mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">N</kbd>
                    <span>Screen Ion Nuke</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">L</kbd>
                    <span>Instant Level Up</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">H</kbd>
                    <span>Full Repair & Shield</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">M</kbd>
                    <span>Graviton Vortex</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">O</kbd>
                    <span>Hyper Overclock</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLAYERS & MODERATION */}
          {currentTab === 'players' && (
            <div className="flex flex-col gap-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1">
                  {(['all', 'flagged', 'active', 'banned'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setPlayerFilter(f)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                        playerFilter === f
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by username or IP..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                  />
                </div>
              </div>

              {/* Players Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase bg-slate-950/60">
                      <th className="py-2.5 px-3">Pilot</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Anomaly Score</th>
                      <th className="py-2.5 px-3 text-right">High Score</th>
                      <th className="py-2.5 px-3 text-center">Runs</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {players.map((p) => {
                      const isBanned = p.status === 'banned';
                      const isHighRisk = p.anomalyScore >= 60;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-200">{p.username}</span>
                            {p.flaggedForReview && (
                              <span className="ml-2 text-[10px] bg-rose-950 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/40 font-sans">
                                FLAG
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-sans font-semibold ${
                                isBanned
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
                                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                              }`}
                            >
                              {p.status.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center tabular-nums">
                            <span
                              className={`font-bold ${
                                isHighRisk ? 'text-rose-400' : p.anomalyScore > 20 ? 'text-amber-400' : 'text-slate-400'
                              }`}
                            >
                              {p.anomalyScore}%
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right tabular-nums text-cyan-300 font-bold">
                            {p.highScore.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-center tabular-nums text-slate-300">
                            {p.totalRuns}
                          </td>

                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {p.ip}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {isBanned ? (
                              <button
                                onClick={() => handleUnban(p)}
                                className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-600/60 rounded text-xs transition-colors"
                              >
                                Revoke Ban
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedPlayer(p);
                                  setBanModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-300 border border-rose-600/60 rounded text-xs transition-colors flex items-center gap-1 ml-auto"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Ban Pilot</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MODIFIERS & BROADCAST */}
          {currentTab === 'modifiers' && stats && (
            <div className="flex flex-col gap-6">
              {/* Broadcast Dispatch */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-xs font-mono font-bold text-cyan-400">
                  <Radio className="w-4 h-4" />
                  <span>TRANSMIT FLEET-WIDE DISPATCH</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  This broadcast banner is immediately displayed on the title screen and leaderboards for every active player.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={broadcastInput}
                    onChange={(e) => setBroadcastInput(e.target.value)}
                    placeholder="Enter broadcast message..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    onClick={handleSendBroadcast}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast</span>
                  </button>
                </div>
              </div>

              {/* Arena Modifiers Toggles */}
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-300 mb-3">
                  Live Global Gameplay Modifiers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {stats.activeModifiers.map((mod) => (
                    <div
                      key={mod.id}
                      className={`p-4 rounded-xl border transition-all ${
                        mod.active
                          ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Flame className={`w-4 h-4 ${mod.active ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <h4 className="text-sm font-bold text-white">{mod.name}</h4>
                        </div>
                        <button
                          onClick={() => handleToggleModifier(mod.id, mod.active)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            mod.active
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {mod.active ? 'ACTIVE' : 'ENABLE'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">{mod.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {currentTab === 'logs' && stats && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-300 mb-3">
                Security & Action Audit Trail
              </h3>
              <div className="flex flex-col gap-2 font-mono text-xs">
                {stats.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                            log.action === 'BAN_USER'
                              ? 'bg-rose-950 text-rose-400'
                              : log.action === 'UNBAN_USER'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-cyan-950 text-cyan-400'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-200">{log.target}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{log.details}</p>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 shrink-0">
                      <div>{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-600">{log.adminEmail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BAN USER MODAL */}
      {banModalOpen && selectedPlayer && (
        <div className="absolute inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/50 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">
                Ban Pilot: {selectedPlayer.username}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Banning this pilot will immediately revoke their access and purge all of their scores from the public leaderboards.
            </p>

            <div className="mb-4">
              <label className="text-[11px] font-mono text-slate-300 block mb-1">
                Select Moderation Reason:
              </label>
              <select
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:border-rose-400 focus:outline-none"
              >
                <option value="Impossible score telemetry & speed manipulation">
                  Impossible score telemetry & speed manipulation
                </option>
                <option value="Automated bot attack & memory packet injection">
                  Automated bot attack & memory packet injection
                </option>
                <option value="Exploit abuse & artificial score inflation">
                  Exploit abuse & artificial score inflation
                </option>
                <option value="Violation of community conduct policy">
                  Violation of community conduct policy
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setBanModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmBan}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
              >
                Confirm Ban & Purge Scores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
