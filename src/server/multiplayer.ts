import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export interface PilotMember {
  id: string;
  callSign: string;
  isHost: boolean;
  isReady: boolean;
  color: string;
  weapon: string;
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  x: number;
  y: number;
  angle: number;
  isDashing: boolean;
  isDead: boolean;
  lastPing: number;
  ws?: WebSocket;
}

export interface LobbyRoom {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
  state: 'waiting' | 'in_game' | 'completed';
  wave: number;
  hostId: string;
  hostName: string;
  createdAt: number;
  pilots: Map<string, PilotMember>;
}

// In-Memory store of active lobbies
export const lobbies = new Map<string, LobbyRoom>();

// Generate 4-digit readable room code (e.g. VNG-4821)
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VNG-${rand}`;
}

// Initial Seed Public Lobby so matchmaking always has a live squad
const seedLobbyId = 'lobby_seed_alpha';
const seedLobby: LobbyRoom = {
  id: seedLobbyId,
  code: 'VNG-7701',
  name: 'Orion Sector Patrol',
  isPrivate: false,
  maxPlayers: 4,
  state: 'waiting',
  wave: 1,
  hostId: 'pilot_bot_spectre',
  hostName: 'Spectre-9',
  createdAt: Date.now() - 1000 * 60 * 5,
  pilots: new Map([
    [
      'pilot_bot_spectre',
      {
        id: 'pilot_bot_spectre',
        callSign: 'Spectre-9',
        isHost: true,
        isReady: true,
        color: '#22d3ee',
        weapon: 'Plasma Burst',
        hp: 100,
        maxHp: 100,
        score: 0,
        kills: 0,
        x: 1600,
        y: 1600,
        angle: 0,
        isDashing: false,
        isDead: false,
        lastPing: Date.now()
      }
    ]
  ])
};
lobbies.set(seedLobbyId, seedLobby);

export function setupMultiplayer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/multiplayer' });

  // Map active client connections to pilot metadata
  const socketPilots = new Map<WebSocket, { lobbyId: string; pilotId: string }>();

  wss.on('connection', (ws: WebSocket) => {
    // Send welcome connection confirmation
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));

    ws.on('message', (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, msg);
      } catch (err) {
        console.error('WS parse error:', err);
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('WS error:', err);
    });
  });

  function handleMessage(ws: WebSocket, msg: any) {
    const { type, payload } = msg;

    switch (type) {
      case 'get_lobbies': {
        sendLobbyList(ws);
        break;
      }

      case 'create_lobby': {
        const { name, isPrivate, maxPlayers, callSign, weapon } = payload;
        const code = generateRoomCode();
        const lobbyId = `lobby_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const pilotId = `pilot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const newLobby: LobbyRoom = {
          id: lobbyId,
          code,
          name: name || `${callSign || 'Vanguard'}'s Squad`,
          isPrivate: Boolean(isPrivate),
          maxPlayers: Math.min(4, Math.max(2, maxPlayers || 4)),
          state: 'waiting',
          wave: 1,
          hostId: pilotId,
          hostName: callSign || 'Pilot',
          createdAt: Date.now(),
          pilots: new Map()
        };

        const hostPilot: PilotMember = {
          id: pilotId,
          callSign: callSign || 'Pilot-1',
          isHost: true,
          isReady: true,
          color: '#22d3ee',
          weapon: weapon || 'Hyper Blaster',
          hp: 100,
          maxHp: 100,
          score: 0,
          kills: 0,
          x: 1600,
          y: 1600,
          angle: 0,
          isDashing: false,
          isDead: false,
          lastPing: Date.now(),
          ws
        };

        newLobby.pilots.set(pilotId, hostPilot);
        lobbies.set(lobbyId, newLobby);
        socketPilots.set(ws, { lobbyId, pilotId });

        // Acknowledge creation
        ws.send(
          JSON.stringify({
            type: 'lobby_joined',
            payload: {
              lobby: serializeLobby(newLobby),
              selfPilotId: pilotId
            }
          })
        );

        broadcastLobbyList();
        break;
      }

      case 'join_lobby': {
        const { lobbyId, code, callSign, weapon } = payload;
        let targetLobby: LobbyRoom | undefined;

        if (lobbyId) {
          targetLobby = lobbies.get(lobbyId);
        } else if (code) {
          const cleanCode = code.trim().toUpperCase();
          targetLobby = Array.from(lobbies.values()).find(
            (l) => l.code === cleanCode || l.code.replace('VNG-', '') === cleanCode.replace('VNG-', '')
          );
        }

        if (!targetLobby) {
          ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found. Please check code.' }));
          return;
        }

        if (targetLobby.pilots.size >= targetLobby.maxPlayers) {
          ws.send(JSON.stringify({ type: 'error', message: 'Squad is already at maximum capacity.' }));
          return;
        }

        const pilotId = `pilot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const colors = ['#22d3ee', '#a855f7', '#f43f5e', '#34d399', '#facc15'];
        const chosenColor = colors[targetLobby.pilots.size % colors.length];

        const newPilot: PilotMember = {
          id: pilotId,
          callSign: callSign || `Pilot-${targetLobby.pilots.size + 1}`,
          isHost: false,
          isReady: false,
          color: chosenColor,
          weapon: weapon || 'Hyper Blaster',
          hp: 100,
          maxHp: 100,
          score: 0,
          kills: 0,
          x: 1600 + (targetLobby.pilots.size * 60),
          y: 1600,
          angle: 0,
          isDashing: false,
          isDead: false,
          lastPing: Date.now(),
          ws
        };

        targetLobby.pilots.set(pilotId, newPilot);
        socketPilots.set(ws, { lobbyId: targetLobby.id, pilotId });

        // Confirm join
        ws.send(
          JSON.stringify({
            type: 'lobby_joined',
            payload: {
              lobby: serializeLobby(targetLobby),
              selfPilotId: pilotId
            }
          })
        );

        // Broadcast to existing room members
        broadcastToLobby(targetLobby.id, {
          type: 'lobby_update',
          payload: { lobby: serializeLobby(targetLobby) }
        });

        broadcastLobbyList();
        break;
      }

      case 'toggle_ready': {
        const info = socketPilots.get(ws);
        if (!info) return;
        const lobby = lobbies.get(info.lobbyId);
        if (!lobby) return;
        const pilot = lobby.pilots.get(info.pilotId);
        if (!pilot) return;

        pilot.isReady = !pilot.isReady;
        broadcastToLobby(lobby.id, {
          type: 'lobby_update',
          payload: { lobby: serializeLobby(lobby) }
        });
        break;
      }

      case 'start_game': {
        const info = socketPilots.get(ws);
        if (!info) return;
        const lobby = lobbies.get(info.lobbyId);
        if (!lobby || lobby.hostId !== info.pilotId) return;

        lobby.state = 'in_game';
        broadcastToLobby(lobby.id, {
          type: 'game_started',
          payload: { lobby: serializeLobby(lobby) }
        });
        broadcastLobbyList();
        break;
      }

      case 'player_sync': {
        // High-frequency telemetry sync
        const info = socketPilots.get(ws);
        if (!info) return;
        const lobby = lobbies.get(info.lobbyId);
        if (!lobby) return;
        const pilot = lobby.pilots.get(info.pilotId);
        if (!pilot) return;

        pilot.x = payload.x;
        pilot.y = payload.y;
        pilot.angle = payload.angle;
        pilot.hp = payload.hp;
        pilot.maxHp = payload.maxHp || pilot.maxHp;
        pilot.score = payload.score || pilot.score;
        pilot.kills = payload.kills || pilot.kills;
        pilot.isDashing = Boolean(payload.isDashing);
        pilot.isDead = payload.hp <= 0;
        pilot.lastPing = Date.now();

        // Broadcast to other squad members
        broadcastToLobby(
          lobby.id,
          {
            type: 'pilot_moved',
            payload: {
              pilotId: pilot.id,
              x: pilot.x,
              y: pilot.y,
              angle: pilot.angle,
              hp: pilot.hp,
              maxHp: pilot.maxHp,
              score: pilot.score,
              kills: pilot.kills,
              isDashing: pilot.isDashing,
              isDead: pilot.isDead
            }
          },
          ws
        );
        break;
      }

      case 'player_fire': {
        // Broadcast projectile firing to squad mates
        const info = socketPilots.get(ws);
        if (!info) return;
        broadcastToLobby(
          info.lobbyId,
          {
            type: 'pilot_fired',
            payload: {
              pilotId: info.pilotId,
              x: payload.x,
              y: payload.y,
              vx: payload.vx,
              vy: payload.vy,
              radius: payload.radius,
              color: payload.color,
              weaponType: payload.weaponType
            }
          },
          ws
        );
        break;
      }

      case 'chat_message': {
        const info = socketPilots.get(ws);
        if (!info) return;
        const lobby = lobbies.get(info.lobbyId);
        if (!lobby) return;
        const pilot = lobby.pilots.get(info.pilotId);
        if (!pilot) return;

        broadcastToLobby(lobby.id, {
          type: 'chat_received',
          payload: {
            pilotId: pilot.id,
            callSign: pilot.callSign,
            color: pilot.color,
            text: String(payload.text || '').slice(0, 100),
            timestamp: Date.now()
          }
        });
        break;
      }

      case 'leave_lobby': {
        handleDisconnect(ws);
        break;
      }
    }
  }

  function handleDisconnect(ws: WebSocket) {
    const info = socketPilots.get(ws);
    if (!info) return;
    socketPilots.delete(ws);

    const lobby = lobbies.get(info.lobbyId);
    if (!lobby) return;

    lobby.pilots.delete(info.pilotId);

    // If room is empty, remove it (unless it is seed lobby)
    if (lobby.pilots.size === 0) {
      if (lobby.id !== seedLobbyId) {
        lobbies.delete(lobby.id);
      } else {
        lobby.state = 'waiting';
      }
    } else if (lobby.hostId === info.pilotId) {
      // Reassign host
      const nextHost = lobby.pilots.values().next().value;
      if (nextHost) {
        lobby.hostId = nextHost.id;
        lobby.hostName = nextHost.callSign;
        nextHost.isHost = true;
      }
    }

    broadcastToLobby(lobby.id, {
      type: 'lobby_update',
      payload: { lobby: serializeLobby(lobby) }
    });
    broadcastLobbyList();
  }

  function broadcastToLobby(lobbyId: string, data: any, excludeWs?: WebSocket) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const msg = JSON.stringify(data);

    for (const pilot of lobby.pilots.values()) {
      if (pilot.ws && pilot.ws !== excludeWs && pilot.ws.readyState === WebSocket.OPEN) {
        pilot.ws.send(msg);
      }
    }
  }

  function sendLobbyList(ws: WebSocket) {
    const publicList = Array.from(lobbies.values())
      .filter((l) => !l.isPrivate && l.state === 'waiting')
      .map(serializeLobbySummary);

    ws.send(
      JSON.stringify({
        type: 'lobby_list',
        payload: { lobbies: publicList }
      })
    );
  }

  function broadcastLobbyList() {
    const publicList = Array.from(lobbies.values())
      .filter((l) => !l.isPrivate && l.state === 'waiting')
      .map(serializeLobbySummary);

    const payload = JSON.stringify({
      type: 'lobby_list',
      payload: { lobbies: publicList }
    });

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN && !socketPilots.has(client)) {
        client.send(payload);
      }
    }
  }

  function serializeLobby(lobby: LobbyRoom) {
    return {
      id: lobby.id,
      code: lobby.code,
      name: lobby.name,
      isPrivate: lobby.isPrivate,
      maxPlayers: lobby.maxPlayers,
      state: lobby.state,
      wave: lobby.wave,
      hostId: lobby.hostId,
      hostName: lobby.hostName,
      pilots: Array.from(lobby.pilots.values()).map((p) => ({
        id: p.id,
        callSign: p.callSign,
        isHost: p.isHost,
        isReady: p.isReady,
        color: p.color,
        weapon: p.weapon,
        hp: p.hp,
        maxHp: p.maxHp,
        score: p.score,
        kills: p.kills,
        isDead: p.isDead
      }))
    };
  }

  function serializeLobbySummary(lobby: LobbyRoom) {
    return {
      id: lobby.id,
      code: lobby.code,
      name: lobby.name,
      hostName: lobby.hostName,
      currentPlayers: lobby.pilots.size,
      maxPlayers: lobby.maxPlayers,
      wave: lobby.wave,
      isPrivate: lobby.isPrivate,
      state: lobby.state
    };
  }
}
