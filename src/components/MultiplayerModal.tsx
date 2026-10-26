import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Hash,
  Copy,
  Check,
  Zap,
  Send,
  Play,
  RefreshCw,
  Radio,
  Lock,
  Globe,
  X,
  Crown,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  mpClient,
  PublicLobbySummary,
  ActiveLobby,
  ChatMessage
} from '../game/multiplayerClient';
import { WeaponType } from '../game/types';

interface MultiplayerModalProps {
  onClose: () => void;
  callSign: string;
  selectedWeapon: WeaponType;
  onLaunchSortie: (weapon: WeaponType) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  onClose,
  callSign,
  selectedWeapon,
  onLaunchSortie
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'code'>('browse');
  const [lobbies, setLobbies] = useState<PublicLobbySummary[]>([]);
  const [currentLobby, setCurrentLobby] = useState<ActiveLobby | null>(mpClient.currentLobby);
  const [selfPilotId, setSelfPilotId] = useState<string | null>(mpClient.selfPilotId);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Create Squad Form State
  const [squadName, setSquadName] = useState(`${callSign}'s Squadron`);
  const [isPrivateSquad, setIsPrivateSquad] = useState(false);
  const [maxPilots, setMaxPilots] = useState(4);

  // Join Code Form State
  const [inputCode, setInputCode] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Setup MP Client listeners
  useEffect(() => {
    mpClient.connect();

    mpClient.onLobbyList = (list) => {
      setLobbies(list);
      setIsLoading(false);
    };

    mpClient.onLobbyJoined = (lobby, pilotId) => {
      setCurrentLobby(lobby);
      setSelfPilotId(pilotId);
      setIsLoading(false);
      setErrorMsg(null);
      setStatusNotification(`Joined squad ${lobby.name} [${lobby.code}]`);
    };

    mpClient.onLobbyUpdate = (lobby) => {
      setCurrentLobby(lobby);
    };

    mpClient.onGameStarted = (lobby) => {
      setCurrentLobby(lobby);
      onLaunchSortie(selectedWeapon);
    };

    mpClient.onChatReceived = (msg) => {
      setChatMessages((prev) => [...prev.slice(-25), msg]);
    };

    mpClient.onError = (err) => {
      setErrorMsg(err);
      setIsLoading(false);
    };

    // Initial fetch
    refreshLobbies();

    return () => {
      mpClient.onLobbyList = undefined;
      mpClient.onLobbyJoined = undefined;
      mpClient.onLobbyUpdate = undefined;
      mpClient.onGameStarted = undefined;
      mpClient.onChatReceived = undefined;
      mpClient.onError = undefined;
    };
  }, [selectedWeapon, onLaunchSortie]);

  const refreshLobbies = () => {
    setIsLoading(true);
    setErrorMsg(null);
    mpClient.getLobbies();
  };

  const handleQuickJoinOrAutoCreate = () => {
    setIsLoading(true);
    setErrorMsg(null);
    // 1. Look for an existing open public lobby
    const available = lobbies.find(
      (l) => !l.isPrivate && l.currentPlayers < l.maxPlayers && l.state === 'waiting'
    );

    if (available) {
      setStatusNotification(`Matching you with public squad ${available.code}...`);
      mpClient.joinLobby(available.id, undefined, callSign, selectedWeapon);
    } else {
      // 2. If no available players/lobbies, create a fresh public squad automatically!
      setStatusNotification('No squads currently recruiting. Initializing new Vanguard public sortie...');
      setTimeout(() => {
        mpClient.createLobby(
          `${callSign}'s Strike Wing`,
          false,
          4,
          callSign,
          selectedWeapon
        );
      }, 300);
    }
  };

  const handleCreateSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    mpClient.createLobby(
      squadName.trim(),
      isPrivateSquad,
      maxPilots,
      callSign,
      selectedWeapon
    );
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    let formatted = inputCode.trim().toUpperCase();
    if (!formatted) return;
    if (!formatted.startsWith('VNG-')) {
      formatted = `VNG-${formatted.replace(/[^A-Z0-9]/g, '')}`;
    }
    setIsLoading(true);
    setErrorMsg(null);
    mpClient.joinLobby(undefined, formatted, callSign, selectedWeapon);
  };

  const handleToggleReady = () => {
    mpClient.toggleReady();
  };

  const handleStartGameAsHost = () => {
    mpClient.startGame();
  };

  const handleLeaveCurrentLobby = () => {
    mpClient.leaveLobby();
    setCurrentLobby(null);
    refreshLobbies();
  };

  const handleCopyCode = () => {
    if (!currentLobby) return;
    navigator.clipboard.writeText(currentLobby.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    mpClient.sendChat(chatInput);
    setChatInput('');
  };

  const sendQuickRadio = (preset: string) => {
    mpClient.sendChat(preset);
  };

  // Determine host status
  const isHost = currentLobby && selfPilotId && currentLobby.hostId === selfPilotId;
  const selfPilot = currentLobby?.pilots.find((p) => p.id === selfPilotId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-lg">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                FLEET MULTIPLAYER CO-OP
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  REAL-TIME FLEET
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Squad up with wingmen or rally a strike group to survive relentless waves.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Error Banner */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-950/70 border-b border-rose-800/80 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {statusNotification && (
          <div className="px-6 py-2 bg-cyan-950/60 border-b border-cyan-800/50 text-cyan-300 text-xs flex items-center justify-between font-mono">
            <span>{statusNotification}</span>
            <button onClick={() => setStatusNotification(null)} className="text-cyan-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Mode: IN ACTIVE SQUAD LOBBY */}
        {currentLobby ? (
          <div className="flex flex-col flex-1 overflow-y-auto p-6 space-y-6">
            {/* Squad Header Lockup */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                    ACTIVE SORTIE LOBBY
                  </span>
                  {currentLobby.isPrivate ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-700/50 rounded">
                      <Lock className="w-3 h-3" /> PRIVATE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded">
                      <Globe className="w-3 h-3" /> PUBLIC
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white tracking-wide">{currentLobby.name}</h3>
                <span className="text-xs text-slate-400">
                  Commander: <span className="text-cyan-300 font-semibold">{currentLobby.hostName}</span>
                </span>
              </div>

              {/* Join Code Display with Copy Button */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-2 px-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">SQUAD JOIN CODE</span>
                  <span className="text-base font-mono font-bold tracking-widest text-cyan-400">
                    {currentLobby.code}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-2 ml-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                  title="Copy room code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Wingmen Pilot Roster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  SQUAD ROSTER ({currentLobby.pilots.length} / {currentLobby.maxPlayers} PILOTS)
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {currentLobby.pilots.every((p) => p.isReady || p.isHost)
                    ? 'ALL WINGMEN READY'
                    : 'Awaiting wingmen readiness...'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentLobby.pilots.map((p) => {
                  const isCurrentSelf = p.id === selfPilotId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                        isCurrentSelf
                          ? 'bg-slate-800/80 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Pilot Ship Color Pip */}
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: p.color || '#38bdf8' }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white tracking-wide">
                              {p.callSign}
                            </span>
                            {p.isHost && (
                              <span title="Squad Host">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                              </span>
                            )}
                            {isCurrentSelf && (
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            Loadout: {p.weapon || 'Hyper Blaster'}
                          </span>
                        </div>
                      </div>

                      <div>
                        {p.isHost ? (
                          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-amber-950/60 border border-amber-600/40 text-amber-300 rounded">
                            HOST
                          </span>
                        ) : p.isReady ? (
                          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 rounded flex items-center gap-1">
                            <Check className="w-3 h-3" /> READY
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded">
                            WAITING
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty Slot Placeholders */}
                {Array.from({ length: currentLobby.maxPlayers - currentLobby.pilots.length }).map(
                  (_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center justify-center p-3.5 rounded-lg border border-dashed border-slate-800/80 bg-slate-950/20 text-slate-600 text-xs font-mono"
                    >
                      <span>Slot Open · Awaiting Wingman</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Tactical Radio Comms Feed */}
            <div className="flex flex-col bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  SQUAD RADIO COMMS
                </span>
                <span className="text-[10px] text-slate-500">Live tactical channel</span>
              </div>

              {/* Chat Log */}
              <div className="h-28 overflow-y-auto space-y-1.5 pr-2 mb-2">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-600 font-mono">
                    Channel silent. Broadcast tactical radio pings below.
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className="text-xs font-mono leading-tight">
                      <span className="font-bold" style={{ color: msg.color }}>
                        [{msg.callSign}]:
                      </span>{' '}
                      <span className="text-slate-300">{msg.text}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'All systems green!',
                  'Form up on leader!',
                  'Need back-up!',
                  'Ready to launch!'
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => sendQuickRadio(preset)}
                    className="px-2 py-0.5 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white rounded transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Transmit comms to squad..."
                  maxLength={120}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Bottom Lobby Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={handleLeaveCurrentLobby}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              >
                Leave Squad
              </button>

              <div className="flex items-center gap-3">
                {!isHost && (
                  <button
                    onClick={handleToggleReady}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold font-mono transition-all ${
                      selfPilot?.isReady
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{selfPilot?.isReady ? 'READY TO ENGAGE' : 'SET STATUS: READY'}</span>
                  </button>
                )}

                {isHost && (
                  <button
                    onClick={handleStartGameAsHost}
                    className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider uppercase rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>LAUNCH SQUAD SORTIE</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* View Mode: LOBBY BROWSER / MATCHMAKER */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Quick Matchmaker Bar */}
            <div className="p-6 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  INSTANT FLEET MATCHMAKER
                </span>
                <span className="text-xs text-slate-400">
                  Finds active wingmen immediately, or auto-spawns a new public squad if none found.
                </span>
              </div>

              <button
                onClick={handleQuickJoinOrAutoCreate}
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all shrink-0 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>FIND MATCH / AUTO-CREATE</span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 px-6 bg-slate-950/20">
              <button
                onClick={() => setActiveTab('browse')}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'browse'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Browse Public Squads</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                  {lobbies.filter((l) => !l.isPrivate).length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'create'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Create Match (Public / Private)</span>
              </button>

              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'code'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hash className="w-4 h-4" />
                <span>Join with Code</span>
              </button>
            </div>

            {/* Tab 1: Browse Public Squads */}
            {activeTab === 'browse' && (
              <div className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    RECRUITING VANGUARD SQUADS
                  </span>
                  <button
                    onClick={refreshLobbies}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {lobbies.filter((l) => !l.isPrivate).length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-lg">
                    <Users className="w-10 h-10 text-slate-600 mb-3" />
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">
                      No Public Squads Recruiting
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                      All orbital sectors are quiet. Create a new squad to host wingmen or use Instant Matchmaker.
                    </p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors"
                    >
                      Create First Squad
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {lobbies
                      .filter((l) => !l.isPrivate)
                      .map((lobby) => {
                        const isFull = lobby.currentPlayers >= lobby.maxPlayers;
                        return (
                          <div
                            key={lobby.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/50 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-cyan-950/40 border border-cyan-800/40 rounded-lg text-cyan-400 shrink-0 mt-0.5">
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-white tracking-wide">
                                    {lobby.name}
                                  </h4>
                                  <span className="font-mono text-[11px] text-cyan-400 px-1.5 py-0.5 bg-cyan-950/60 rounded border border-cyan-800/40">
                                    {lobby.code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                  <span>Leader: {lobby.hostName}</span>
                                  <span>·</span>
                                  <span>Wave {lobby.wave}</span>
                                  <span>·</span>
                                  <span
                                    className={
                                      lobby.state === 'in_game'
                                        ? 'text-amber-400 font-semibold'
                                        : 'text-emerald-400 font-semibold'
                                    }
                                  >
                                    {lobby.state === 'in_game' ? 'Sortie Active' : 'Waiting in Hangar'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-right">
                                <span className="font-mono text-sm font-bold text-slate-200">
                                  {lobby.currentPlayers} / {lobby.maxPlayers}
                                </span>
                                <span className="text-[10px] text-slate-500 block uppercase">PILOTS</span>
                              </div>

                              <button
                                onClick={() =>
                                  mpClient.joinLobby(lobby.id, undefined, callSign, selectedWeapon)
                                }
                                disabled={isFull || isLoading}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all ${
                                  isFull
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                }`}
                              >
                                <span>{isFull ? 'FULL' : 'JOIN SQUAD'}</span>
                                {!isFull && <ArrowRight className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Create Match (Public / Private) */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreateSquad} className="p-6 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                    Squad Name
                  </label>
                  <input
                    type="text"
                    value={squadName}
                    onChange={(e) => setSquadName(e.target.value)}
                    maxLength={32}
                    required
                    placeholder="e.g. Orion Interceptors"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Squad Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPrivateSquad(false)}
                      className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                        !isPrivateSquad
                          ? 'bg-cyan-950/40 border-cyan-400 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className={`w-4 h-4 ${!isPrivateSquad ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold">Public Squad</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Listed in the browser and open for quick matchmaking.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPrivateSquad(true)}
                      className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                        isPrivateSquad
                          ? 'bg-purple-950/40 border-purple-400 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className={`w-4 h-4 ${isPrivateSquad ? 'text-purple-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold">Private Squad</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Hidden from browser. Only pilots with your secret Join Code can enter.
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Fleet Squad Capacity
                  </label>
                  <div className="flex gap-3">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMaxPilots(count)}
                        className={`flex-1 py-2.5 px-4 rounded-lg border font-mono text-xs font-bold transition-all ${
                          maxPilots === count
                            ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {count} Pilots
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider uppercase rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>CREATE SQUAD & GENERATE CODE</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Join With Code */}
            {activeTab === 'code' && (
              <form onSubmit={handleJoinByCode} className="p-8 flex flex-col items-center justify-center flex-1 space-y-6">
                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Hash className="w-6 h-6" />
                </div>

                <div className="text-center max-w-sm">
                  <h3 className="text-base font-bold text-white mb-1">Enter Secret Squad Code</h3>
                  <p className="text-xs text-slate-400">
                    Ask your squad leader for their 4-digit code (e.g. 7701 or VNG-7701) to join their private or public room.
                  </p>
                </div>

                <div className="w-full max-w-xs">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="VNG-XXXX"
                    maxLength={10}
                    required
                    className="w-full text-center px-4 py-3 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg text-lg font-mono font-bold tracking-widest text-cyan-300 outline-none uppercase placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputCode.trim() || isLoading}
                  className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs tracking-wider uppercase rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>ENGAGE & JOIN ROOM</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
