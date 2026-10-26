/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { NeonEngine } from './game/engine';
import { GameState, PerkOption, PlayerStats, RunSummary, WeaponType } from './game/types';
import { sound } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { PerkDraftModal } from './components/PerkDraftModal';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MultiplayerModal } from './components/MultiplayerModal';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<NeonEngine | null>(null);

  // High-level App & UI States
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [multiplayerWeapon, setMultiplayerWeapon] = useState<WeaponType>('Hyper Blaster');
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [callSign, setCallSign] = useState(() => {
    return localStorage.getItem('nv_callsign') || 'Vanguard-1';
  });

  // Active Game State Snapshot (from engine)
  const [stats, setStats] = useState<PlayerStats>({
    hp: 100,
    maxHp: 100,
    speed: 280,
    level: 1,
    xp: 0,
    xpToNext: 45,
    score: 0,
    wave: 1,
    kills: 0,
    timeSeconds: 0,
    dashCooldown: 0,
    dashReady: true,
    critChance: 0.08,
    damageMultiplier: 1.0,
    magnetRadius: 140,
    activePerks: [],
    primaryWeapon: 'Hyper Blaster',
    cheats: {
      godMode: false,
      infiniteDash: false,
      hyperOverclock: false,
      infiniteMagnet: false
    }
  });

  const [perkChoices, setPerkChoices] = useState<PerkOption[]>([]);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(null);

  // Initialize Engine once on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new NeonEngine(canvasRef.current);
    engineRef.current = engine;

    engine.onStateChange = (newState) => {
      setGameState(newState);
    };

    engine.onStatsUpdate = (newStats) => {
      setStats(newStats);
    };

    engine.onPerkOptions = (options) => {
      setPerkChoices(options);
    };

    engine.onRunEnd = (summary) => {
      setRunSummary(summary);
    };

    engine.startLoop();

    // Fetch initial fleet broadcast
    fetch('/api/community/live-feed')
      .then((res) => res.json())
      .then((data) => {
        if (data.broadcast) setActiveBroadcast(data.broadcast);
      })
      .catch(() => {});

    return () => {
      engine.destroy();
    };
  }, []);

  const handleCallSignChange = (val: string) => {
    setCallSign(val);
    localStorage.setItem('nv_callsign', val);
  };

  const handleToggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const handleStartGame = (startingWeapon: WeaponType) => {
    if (engineRef.current) {
      engineRef.current.startGame(startingWeapon, false);
    }
  };

  const handleOpenMultiplayer = (weapon: WeaponType) => {
    setMultiplayerWeapon(weapon);
    setShowMultiplayer(true);
  };

  const handleLaunchMultiplayerSortie = (weapon: WeaponType) => {
    setShowMultiplayer(false);
    if (engineRef.current) {
      engineRef.current.startGame(weapon, true);
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
  };

  const handleSelectPerk = (perk: PerkOption) => {
    if (engineRef.current) {
      engineRef.current.selectPerk(perk);
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.setState('PAUSED');
    }
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.setState('PLAYING');
    }
  };

  const handleReturnToTitle = () => {
    if (engineRef.current) {
      engineRef.current.setState('TITLE');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070f] font-sans">
      {/* Isolated 60fps Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full cursor-crosshair touch-none"
      />

      {/* State: Title Screen */}
      {gameState === 'TITLE' && !showLeaderboard && !showAdmin && !showMultiplayer && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenMultiplayer={handleOpenMultiplayer}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenAdmin={() => setShowAdmin(true)}
          callSign={callSign}
          onCallSignChange={handleCallSignChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          activeBroadcast={activeBroadcast}
        />
      )}

      {/* State: Active HUD (Visible during gameplay and perk drafting) */}
      {(gameState === 'PLAYING' || gameState === 'PERK_SELECTION') && (
        <GameHUD
          stats={stats}
          onPause={handlePause}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* State: Perk Selection Draft Modal */}
      {gameState === 'PERK_SELECTION' && (
        <PerkDraftModal
          options={perkChoices}
          onSelect={handleSelectPerk}
        />
      )}

      {/* State: Pause Menu */}
      {gameState === 'PAUSED' && (
        <PauseMenu
          onResume={handleResume}
          onRestart={handleRestart}
          onTitle={handleReturnToTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* State: Mission Debrief / Game Over */}
      {gameState === 'GAME_OVER' && runSummary && !showLeaderboard && !showAdmin && (
        <GameOverModal
          summary={runSummary}
          callSign={callSign}
          onRestart={handleRestart}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onTitle={handleReturnToTitle}
        />
      )}

      {/* Real-time Global Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          onClose={() => setShowLeaderboard(false)}
          currentCallSign={callSign}
        />
      )}

      {/* Admin Command Dashboard */}
      {showAdmin && (
        <AdminDashboard
          onClose={() => setShowAdmin(false)}
          engine={engineRef.current}
        />
      )}

      {/* Fleet Multiplayer Co-op Modal */}
      {showMultiplayer && (
        <MultiplayerModal
          onClose={() => setShowMultiplayer(false)}
          callSign={callSign}
          selectedWeapon={multiplayerWeapon}
          onLaunchSortie={handleLaunchMultiplayerSortie}
        />
      )}
    </div>
  );
}
