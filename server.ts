import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { setupMultiplayer, lobbies, generateRoomCode } from './src/server/multiplayer';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory state for Players, Leaderboards, Logs, and Live Modifiers
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
  anomalyScore: number; // 0-100 cheat suspicion
  flaggedForReview: boolean;
  createdAt: string;
  lastActive: string;
  favoriteWeapon: string;
}

interface LeaderboardEntry {
  id: string;
  playerId: string;
  username: string;
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

interface AdminLog {
  id: string;
  timestamp: string;
  action: 'BAN_USER' | 'UNBAN_USER' | 'DELETE_SCORE' | 'SET_MODIFIER' | 'BROADCAST_MESSAGE' | 'WIPE_STATS';
  target: string;
  details: string;
  adminEmail: string;
}

interface SystemModifier {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: 'xp_surge' | 'overclock' | 'boss_rush' | 'hyper_drive';
}

// Initial Seed Data
const initialPlayers: PlayerRecord[] = [
  {
    id: 'p_apex',
    username: 'NovaVanguard',
    ip: '198.51.100.12',
    status: 'active',
    totalRuns: 64,
    highScore: 142850,
    highestWave: 18,
    totalKills: 3820,
    totalPlaytimeSeconds: 15420,
    anomalyScore: 4,
    flaggedForReview: false,
    createdAt: '2026-10-10T14:20:00Z',
    lastActive: '2026-10-25T08:15:00Z',
    favoriteWeapon: 'Plasma Burst'
  },
  {
    id: 'p_2',
    username: 'ZeroVector',
    ip: '198.51.100.28',
    status: 'active',
    totalRuns: 49,
    highScore: 128400,
    highestWave: 16,
    totalKills: 3210,
    totalPlaytimeSeconds: 11900,
    anomalyScore: 8,
    flaggedForReview: false,
    createdAt: '2026-10-12T09:10:00Z',
    lastActive: '2026-10-25T07:44:00Z',
    favoriteWeapon: 'Tesla Arc'
  },
  {
    id: 'p_3',
    username: 'AegisCore',
    ip: '203.0.113.88',
    status: 'active',
    totalRuns: 55,
    highScore: 115900,
    highestWave: 15,
    totalKills: 2950,
    totalPlaytimeSeconds: 13200,
    anomalyScore: 6,
    flaggedForReview: false,
    createdAt: '2026-10-11T18:00:00Z',
    lastActive: '2026-10-25T06:30:00Z',
    favoriteWeapon: 'Orbital Blades'
  },
  {
    id: 'p_4',
    username: 'KitsunePulse',
    ip: '192.0.2.145',
    status: 'active',
    totalRuns: 38,
    highScore: 98450,
    highestWave: 14,
    totalKills: 2480,
    totalPlaytimeSeconds: 8900,
    anomalyScore: 3,
    flaggedForReview: false,
    createdAt: '2026-10-14T21:40:00Z',
    lastActive: '2026-10-25T08:22:00Z',
    favoriteWeapon: 'Hyper Blaster'
  },
  {
    id: 'p_5',
    username: 'PhantomDrift',
    ip: '198.51.100.99',
    status: 'active',
    totalRuns: 30,
    highScore: 88200,
    highestWave: 12,
    totalKills: 2190,
    totalPlaytimeSeconds: 7400,
    anomalyScore: 5,
    flaggedForReview: false,
    createdAt: '2026-10-15T11:00:00Z',
    lastActive: '2026-10-24T22:15:00Z',
    favoriteWeapon: 'Plasma Burst'
  },
  {
    id: 'p_6',
    username: 'SolarFlare',
    ip: '203.0.113.42',
    status: 'active',
    totalRuns: 27,
    highScore: 76500,
    highestWave: 11,
    totalKills: 1840,
    totalPlaytimeSeconds: 6100,
    anomalyScore: 7,
    flaggedForReview: false,
    createdAt: '2026-10-17T16:30:00Z',
    lastActive: '2026-10-25T07:10:00Z',
    favoriteWeapon: 'Tesla Arc'
  },
  {
    id: 'p_7',
    username: 'ChronoGlitch',
    ip: '192.0.2.204',
    status: 'active',
    totalRuns: 22,
    highScore: 69400,
    highestWave: 10,
    totalKills: 1610,
    totalPlaytimeSeconds: 5200,
    anomalyScore: 9,
    flaggedForReview: false,
    createdAt: '2026-10-18T19:20:00Z',
    lastActive: '2026-10-25T05:50:00Z',
    favoriteWeapon: 'Orbital Blades'
  },
  {
    id: 'p_8',
    username: 'Hyperion9',
    ip: '198.51.100.17',
    status: 'active',
    totalRuns: 19,
    highScore: 58900,
    highestWave: 9,
    totalKills: 1390,
    totalPlaytimeSeconds: 4300,
    anomalyScore: 4,
    flaggedForReview: false,
    createdAt: '2026-10-19T13:45:00Z',
    lastActive: '2026-10-24T20:40:00Z',
    favoriteWeapon: 'Hyper Blaster'
  },
  {
    id: 'p_sus_1',
    username: 'G0d_Hax_9999',
    ip: '45.154.255.8',
    status: 'active',
    totalRuns: 2,
    highScore: 99999999,
    highestWave: 99,
    totalKills: 12,
    totalPlaytimeSeconds: 18,
    anomalyScore: 98,
    flaggedForReview: true,
    createdAt: '2026-10-25T08:30:00Z',
    lastActive: '2026-10-25T08:32:00Z',
    favoriteWeapon: 'Hyper Blaster'
  },
  {
    id: 'p_sus_2',
    username: 'PacketInject_X',
    ip: '185.220.101.5',
    status: 'active',
    totalRuns: 1,
    highScore: 38500000,
    highestWave: 50,
    totalKills: 0,
    totalPlaytimeSeconds: 24,
    anomalyScore: 94,
    flaggedForReview: true,
    createdAt: '2026-10-25T08:45:00Z',
    lastActive: '2026-10-25T08:46:00Z',
    favoriteWeapon: 'Tesla Arc'
  },
  {
    id: 'p_banned_1',
    username: 'BotSpam_404',
    ip: '194.26.29.11',
    status: 'banned',
    banReason: 'Automated replay attack & memory injection',
    bannedAt: '2026-10-24T18:12:00Z',
    totalRuns: 4,
    highScore: 8888888,
    highestWave: 40,
    totalKills: 10,
    totalPlaytimeSeconds: 45,
    anomalyScore: 99,
    flaggedForReview: true,
    createdAt: '2026-10-24T18:00:00Z',
    lastActive: '2026-10-24T18:10:00Z',
    favoriteWeapon: 'Plasma Burst'
  }
];

const initialLeaderboard: LeaderboardEntry[] = [
  {
    id: 'run_sus_1',
    playerId: 'p_sus_1',
    username: 'G0d_Hax_9999',
    score: 99999999,
    wave: 99,
    kills: 12,
    survivalSeconds: 18,
    loadout: { weapon: 'Hyper Blaster', perkCount: 1, maxDps: 999999 },
    timestamp: '2026-10-25T08:32:00Z',
    verified: false,
    flagged: true
  },
  {
    id: 'run_sus_2',
    playerId: 'p_sus_2',
    username: 'PacketInject_X',
    score: 38500000,
    wave: 50,
    kills: 0,
    survivalSeconds: 24,
    loadout: { weapon: 'Tesla Arc', perkCount: 1, maxDps: 500000 },
    timestamp: '2026-10-25T08:46:00Z',
    verified: false,
    flagged: true
  },
  {
    id: 'run_1',
    playerId: 'p_apex',
    username: 'NovaVanguard',
    score: 142850,
    wave: 18,
    kills: 980,
    survivalSeconds: 495,
    loadout: { weapon: 'Plasma Burst', perkCount: 8, maxDps: 1840 },
    timestamp: '2026-10-25T08:15:00Z',
    verified: true
  },
  {
    id: 'run_2',
    playerId: 'p_2',
    username: 'ZeroVector',
    score: 128400,
    wave: 16,
    kills: 840,
    survivalSeconds: 440,
    loadout: { weapon: 'Tesla Arc', perkCount: 7, maxDps: 1620 },
    timestamp: '2026-10-25T07:44:00Z',
    verified: true
  },
  {
    id: 'run_3',
    playerId: 'p_3',
    username: 'AegisCore',
    score: 115900,
    wave: 15,
    kills: 760,
    survivalSeconds: 410,
    loadout: { weapon: 'Orbital Blades', perkCount: 7, maxDps: 1490 },
    timestamp: '2026-10-25T06:30:00Z',
    verified: true
  },
  {
    id: 'run_4',
    playerId: 'p_4',
    username: 'KitsunePulse',
    score: 98450,
    wave: 14,
    kills: 690,
    survivalSeconds: 375,
    loadout: { weapon: 'Hyper Blaster', perkCount: 6, maxDps: 1350 },
    timestamp: '2026-10-25T08:22:00Z',
    verified: true
  },
  {
    id: 'run_5',
    playerId: 'p_5',
    username: 'PhantomDrift',
    score: 88200,
    wave: 12,
    kills: 590,
    survivalSeconds: 330,
    loadout: { weapon: 'Plasma Burst', perkCount: 5, maxDps: 1210 },
    timestamp: '2026-10-24T22:15:00Z',
    verified: true
  },
  {
    id: 'run_6',
    playerId: 'p_6',
    username: 'SolarFlare',
    score: 76500,
    wave: 11,
    kills: 510,
    survivalSeconds: 295,
    loadout: { weapon: 'Tesla Arc', perkCount: 5, maxDps: 1080 },
    timestamp: '2026-10-25T07:10:00Z',
    verified: true
  },
  {
    id: 'run_7',
    playerId: 'p_7',
    username: 'ChronoGlitch',
    score: 69400,
    wave: 10,
    kills: 440,
    survivalSeconds: 270,
    loadout: { weapon: 'Orbital Blades', perkCount: 4, maxDps: 980 },
    timestamp: '2026-10-25T05:50:00Z',
    verified: true
  },
  {
    id: 'run_8',
    playerId: 'p_8',
    username: 'Hyperion9',
    score: 58900,
    wave: 9,
    kills: 390,
    survivalSeconds: 240,
    loadout: { weapon: 'Hyper Blaster', perkCount: 4, maxDps: 870 },
    timestamp: '2026-10-24T20:40:00Z',
    verified: true
  }
];

const initialLogs: AdminLog[] = [
  {
    id: 'log_1',
    timestamp: '2026-10-24T18:12:00Z',
    action: 'BAN_USER',
    target: 'BotSpam_404',
    details: 'Automated replay attack & memory injection. Banned and purged from leaderboards.',
    adminEmail: 'aliuq1125@gmail.com'
  },
  {
    id: 'log_2',
    timestamp: '2026-10-25T06:00:00Z',
    action: 'SET_MODIFIER',
    target: 'Global Arena',
    details: 'Activated weekend modifier: XP Surge (+25% Crystal Yield)',
    adminEmail: 'aliuq1125@gmail.com'
  }
];

const initialModifiers: SystemModifier[] = [
  {
    id: 'mod_xp',
    name: 'XP Surge',
    description: 'Increases energy crystal collection values by +25%',
    active: true,
    type: 'xp_surge'
  },
  {
    id: 'mod_overclock',
    name: 'Overclock Pulse',
    description: 'Player base rate of fire boosted by 15%',
    active: false,
    type: 'overclock'
  },
  {
    id: 'mod_boss',
    name: 'Boss Rush Alert',
    description: 'Colossus encounters trigger every 2 waves instead of 5',
    active: false,
    type: 'boss_rush'
  },
  {
    id: 'mod_hyper',
    name: 'Hyper Velocity',
    description: 'Both ship thrust and enemy swarm speeds increased by 20%',
    active: false,
    type: 'hyper_drive'
  }
];

// Persistent state in memory
let players = [...initialPlayers];
let leaderboards = [...initialLeaderboard];
let logs = [...initialLogs];
let modifiers = [...initialModifiers];
let activeBroadcast = 'Welcome to Season 1 Vanguard Tournament! Push the limits and claim your spot on the Grandmaster roster.';

// Helper: check if player is banned
function isPlayerBanned(usernameOrId: string): boolean {
  const p = players.find(x => x.id === usernameOrId || x.username.toLowerCase() === usernameOrId.toLowerCase());
  return p ? p.status === 'banned' : false;
}

// REST API ROUTES

// 1. Public Leaderboards (auto-excludes banned users)
app.get('/api/leaderboard', (req, res) => {
  const timeframe = (req.query.timeframe as string) || 'all-time'; // 'all-time' | 'today' | 'weekly'
  
  // Filter out runs from banned players
  const bannedPlayerIds = new Set(players.filter(p => p.status === 'banned').map(p => p.id));
  
  let validRuns = leaderboards.filter(run => !bannedPlayerIds.has(run.playerId));

  // Timeframe filtering
  if (timeframe === 'today') {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    validRuns = validRuns.filter(r => r.timestamp >= oneDayAgo);
  } else if (timeframe === 'weekly') {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    validRuns = validRuns.filter(r => r.timestamp >= oneWeekAgo);
  }

  // Sort descending by score
  const sorted = [...validRuns].sort((a, b) => b.score - a.score);

  // Return top 50 with rank
  const ranked = sorted.slice(0, 50).map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  res.json({
    leaderboard: ranked,
    totalEntries: sorted.length,
    activeModifier: modifiers.find(m => m.active)?.name || null,
    broadcast: activeBroadcast
  });
});

// 2. Submit Score from run completion
app.post('/api/scores', (req, res) => {
  const { username, score, wave, kills, survivalSeconds, loadout } = req.body;

  if (!username || typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Invalid score payload' });
  }

  const cleanUsername = username.trim().slice(0, 24);

  // Check if user is currently banned
  let player = players.find(p => p.username.toLowerCase() === cleanUsername.toLowerCase());

  if (player && player.status === 'banned') {
    return res.status(403).json({
      error: 'PILOT_ACCOUNT_BANNED',
      message: `Your call-sign is banned: ${player.banReason || 'Security policy violation'}`
    });
  }

  // Anti-cheat verification
  const safeSeconds = Math.max(1, survivalSeconds || 1);
  const scorePerSec = score / safeSeconds;
  const killsPerSec = (kills || 0) / safeSeconds;
  
  let isAnomaly = false;
  let suspicion = 0;

  // Impossible thresholds check
  if (scorePerSec > 6000 || (score > 1000000 && safeSeconds < 120) || (kills === 0 && score > 20000)) {
    isAnomaly = true;
    suspicion = 95;
  } else if (scorePerSec > 3500) {
    isAnomaly = true;
    suspicion = 70;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // Create player if new
  if (!player) {
    player = {
      id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: cleanUsername,
      ip: clientIp,
      status: 'active',
      totalRuns: 1,
      highScore: score,
      highestWave: wave || 1,
      totalKills: kills || 0,
      totalPlaytimeSeconds: survivalSeconds || 0,
      anomalyScore: suspicion,
      flaggedForReview: isAnomaly,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      favoriteWeapon: loadout?.weapon || 'Hyper Blaster'
    };
    players.push(player);
  } else {
    player.totalRuns += 1;
    player.totalKills += kills || 0;
    player.totalPlaytimeSeconds += survivalSeconds || 0;
    player.lastActive = new Date().toISOString();
    if (score > player.highScore) player.highScore = score;
    if ((wave || 1) > player.highestWave) player.highestWave = wave || 1;
    if (isAnomaly) {
      player.flaggedForReview = true;
      player.anomalyScore = Math.max(player.anomalyScore, suspicion);
    }
  }

  // Record leaderboard entry
  const runEntry: LeaderboardEntry = {
    id: `run_${Date.now()}`,
    playerId: player.id,
    username: cleanUsername,
    score,
    wave: wave || 1,
    kills: kills || 0,
    survivalSeconds: survivalSeconds || 0,
    loadout: loadout || { weapon: 'Hyper Blaster', perkCount: 0, maxDps: 0 },
    timestamp: new Date().toISOString(),
    verified: !isAnomaly,
    flagged: isAnomaly
  };

  leaderboards.push(runEntry);

  if (isAnomaly) {
    logs.unshift({
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SET_MODIFIER',
      target: cleanUsername,
      details: `ANTI-CHEAT ALERT: Suspicious score submission flagged (${score.toLocaleString()} pts in ${safeSeconds}s, Anomaly: ${suspicion}%)`,
      adminEmail: 'system'
    });
  }

  // Calculate user rank
  const activeValidRuns = leaderboards.filter(r => !isPlayerBanned(r.playerId));
  activeValidRuns.sort((a, b) => b.score - a.score);
  const userRank = activeValidRuns.findIndex(r => r.id === runEntry.id) + 1;

  res.json({
    success: true,
    runId: runEntry.id,
    rank: userRank > 0 ? userRank : activeValidRuns.length,
    highScore: player.highScore,
    isPersonalBest: score >= player.highScore,
    flagged: isAnomaly
  });
});

// 3. Community Feed & Global Stats
app.get('/api/community/live-feed', (req, res) => {
  const activeValid = leaderboards.filter(r => !isPlayerBanned(r.playerId));
  const recentRuns = [...activeValid].reverse().slice(0, 10);

  const totalDestruction = players.reduce((sum, p) => sum + p.totalKills, 0);
  const totalPlaytime = players.reduce((sum, p) => sum + p.totalPlaytimeSeconds, 0);

  res.json({
    recentRuns,
    totalPilots: players.filter(p => p.status !== 'banned').length,
    totalDestruction,
    totalPlaytimeHours: Math.round(totalPlaytime / 3600),
    activeModifier: modifiers.find(m => m.active) || null,
    broadcast: activeBroadcast
  });
});

// ================= ADMIN APIS =================

// Middleware to verify admin authorization
function checkAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'] as string;
  const adminEmail = (req.headers['x-admin-email'] as string) || '';

  // Allowed if passcode matches 'admin2026' or authorized owner email aliuq1125@gmail.com
  const isPasscodeValid = adminKey === 'admin2026' || authHeader === 'Bearer admin2026';
  const isOwnerEmail = adminEmail.toLowerCase() === 'aliuq1125@gmail.com';

  if (isPasscodeValid || isOwnerEmail) {
    return next();
  }

  return res.status(401).json({
    error: 'UNAUTHORIZED',
    message: 'Valid Admin passcode or owner authorization required.'
  });
}

// 4. Admin Overview Stats
app.get('/api/admin/stats', checkAdminAuth, (req, res) => {
  const totalPlayers = players.length;
  const activePlayers = players.filter(p => p.status === 'active').length;
  const bannedPlayers = players.filter(p => p.status === 'banned').length;
  const flaggedPlayers = players.filter(p => p.flaggedForReview && p.status !== 'banned').length;

  const totalRuns = leaderboards.length;
  const totalKills = players.reduce((acc, p) => acc + p.totalKills, 0);
  const totalTimeSecs = players.reduce((acc, p) => acc + p.totalPlaytimeSeconds, 0);
  const avgSurvivalTime = totalRuns > 0 ? Math.round(totalTimeSecs / totalRuns) : 0;

  // Weapon popularity
  const weaponCounts: Record<string, number> = {};
  leaderboards.forEach(r => {
    const w = r.loadout?.weapon || 'Hyper Blaster';
    weaponCounts[w] = (weaponCounts[w] || 0) + 1;
  });

  res.json({
    summary: {
      totalPlayers,
      activePlayers,
      bannedPlayers,
      flaggedPlayers,
      totalRuns,
      totalKills,
      avgSurvivalTime,
      totalPlaytimeHours: (totalTimeSecs / 3600).toFixed(1)
    },
    weaponMeta: weaponCounts,
    activeModifiers: modifiers,
    broadcast: activeBroadcast,
    recentLogs: logs.slice(0, 15)
  });
});

// 5. Admin Players List
app.get('/api/admin/players', checkAdminAuth, (req, res) => {
  const search = ((req.query.search as string) || '').toLowerCase();
  const filter = (req.query.filter as string) || 'all'; // 'all' | 'flagged' | 'banned' | 'active'

  let list = [...players];

  if (filter === 'flagged') {
    list = list.filter(p => p.flaggedForReview);
  } else if (filter === 'banned') {
    list = list.filter(p => p.status === 'banned');
  } else if (filter === 'active') {
    list = list.filter(p => p.status === 'active');
  }

  if (search) {
    list = list.filter(p => p.username.toLowerCase().includes(search) || p.ip.includes(search));
  }

  // Sort: flagged/high anomaly first, then high score
  list.sort((a, b) => b.anomalyScore - a.anomalyScore || b.highScore - a.highScore);

  res.json({ players: list });
});

// 6. Ban User
app.post('/api/admin/ban', checkAdminAuth, (req, res) => {
  const { playerId, username, reason } = req.body;
  const adminEmail = (req.headers['x-admin-email'] as string) || 'aliuq1125@gmail.com';

  const player = players.find(p => p.id === playerId || p.username.toLowerCase() === (username || '').toLowerCase());

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const banReason = reason || 'Violation of fair play and competitive integrity';
  player.status = 'banned';
  player.banReason = banReason;
  player.bannedAt = new Date().toISOString();

  // Audit log
  logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'BAN_USER',
    target: player.username,
    details: `Pilot banned. Reason: ${banReason}`,
    adminEmail
  });

  res.json({
    success: true,
    message: `Pilot ${player.username} has been banned and purged from public leaderboards.`,
    player
  });
});

// 7. Unban User
app.post('/api/admin/unban', checkAdminAuth, (req, res) => {
  const { playerId, username } = req.body;
  const adminEmail = (req.headers['x-admin-email'] as string) || 'aliuq1125@gmail.com';

  const player = players.find(p => p.id === playerId || p.username.toLowerCase() === (username || '').toLowerCase());

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  player.status = 'active';
  player.banReason = undefined;
  player.bannedAt = undefined;
  player.flaggedForReview = false;
  player.anomalyScore = Math.min(player.anomalyScore, 20);

  logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'UNBAN_USER',
    target: player.username,
    details: 'Ban revoked by administrator.',
    adminEmail
  });

  res.json({
    success: true,
    message: `Pilot ${player.username} has been restored to active duty.`,
    player
  });
});

// 8. Delete a specific fraudulent run / score
app.post('/api/admin/delete-score', checkAdminAuth, (req, res) => {
  const { runId } = req.body;
  const adminEmail = (req.headers['x-admin-email'] as string) || 'aliuq1125@gmail.com';

  const targetIndex = leaderboards.findIndex(r => r.id === runId);
  if (targetIndex === -1) {
    return res.status(404).json({ error: 'Run entry not found' });
  }

  const removed = leaderboards.splice(targetIndex, 1)[0];

  logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'DELETE_SCORE',
    target: `${removed.username} (${removed.score.toLocaleString()} pts)`,
    details: `Fraudulent run ${runId} deleted from records.`,
    adminEmail
  });

  res.json({
    success: true,
    message: `Score entry ${runId} deleted.`,
    deletedScore: removed
  });
});

// 9. Toggle / Update Global Modifiers
app.post('/api/admin/modifier', checkAdminAuth, (req, res) => {
  const { modifierId, active } = req.body;
  const adminEmail = (req.headers['x-admin-email'] as string) || 'aliuq1125@gmail.com';

  const mod = modifiers.find(m => m.id === modifierId);
  if (!mod) {
    return res.status(404).json({ error: 'Modifier not found' });
  }

  mod.active = Boolean(active);

  logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SET_MODIFIER',
    target: mod.name,
    details: `Modifier ${mod.name} is now ${mod.active ? 'ACTIVE' : 'DISABLED'}`,
    adminEmail
  });

  res.json({ success: true, modifier: mod });
});

// 10. Broadcast Alert message to all players
app.post('/api/admin/broadcast', checkAdminAuth, (req, res) => {
  const { message } = req.body;
  const adminEmail = (req.headers['x-admin-email'] as string) || 'aliuq1125@gmail.com';

  activeBroadcast = String(message || '').trim();

  logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'BROADCAST_MESSAGE',
    target: 'All Pilots',
    details: `Broadcast alert updated: "${activeBroadcast}"`,
    adminEmail
  });

  res.json({ success: true, broadcast: activeBroadcast });
});

// 11. View Admin Logs
app.get('/api/admin/logs', checkAdminAuth, (req, res) => {
  res.json({ logs });
});

// 12. Multiplayer Lobbies API
app.get('/api/lobbies', (req, res) => {
  const publicList = Array.from(lobbies.values())
    .filter(l => !l.isPrivate && l.state === 'waiting')
    .map(l => ({
      id: l.id,
      code: l.code,
      name: l.name,
      hostName: l.hostName,
      currentPlayers: l.pilots.size,
      maxPlayers: l.maxPlayers,
      wave: l.wave,
      isPrivate: l.isPrivate,
      state: l.state
    }));
  res.json({ lobbies: publicList });
});

app.post('/api/lobbies/find-code', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });
  const cleanCode = String(code).trim().toUpperCase();
  const match = Array.from(lobbies.values()).find(
    l => l.code === cleanCode || l.code.replace('VNG-', '') === cleanCode.replace('VNG-', '')
  );
  if (!match) {
    return res.status(404).json({ error: 'Squad room not found. Check the code and try again.' });
  }
  if (match.pilots.size >= match.maxPlayers) {
    return res.status(400).json({ error: 'Squad lobby is already full (max pilots reached).' });
  }
  res.json({
    lobby: {
      id: match.id,
      code: match.code,
      name: match.name,
      hostName: match.hostName,
      currentPlayers: match.pilots.size,
      maxPlayers: match.maxPlayers,
      isPrivate: match.isPrivate,
      state: match.state
    }
  });
});

// Dev vs Prod Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  const server = http.createServer(app);
  setupMultiplayer(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server with WebSockets listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
