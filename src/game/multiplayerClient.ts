export interface PublicLobbySummary {
  id: string;
  code: string;
  name: string;
  hostName: string;
  currentPlayers: number;
  maxPlayers: number;
  wave: number;
  isPrivate: boolean;
  state: 'waiting' | 'in_game';
}

export interface LobbyPilot {
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
  isDead: boolean;
}

export interface ActiveLobby {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
  state: 'waiting' | 'in_game' | 'completed';
  wave: number;
  hostId: string;
  hostName: string;
  pilots: LobbyPilot[];
}

export interface ChatMessage {
  pilotId: string;
  callSign: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface RemotePilotUpdate {
  pilotId: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  isDashing: boolean;
  isDead: boolean;
}

export interface RemoteFireEvent {
  pilotId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  weaponType: string;
}

class MultiplayerManager {
  private ws: WebSocket | null = null;
  public isConnected: boolean = false;
  public currentLobby: ActiveLobby | null = null;
  public selfPilotId: string | null = null;

  // Listeners
  public onLobbyList?: (lobbies: PublicLobbySummary[]) => void;
  public onLobbyJoined?: (lobby: ActiveLobby, selfPilotId: string) => void;
  public onLobbyUpdate?: (lobby: ActiveLobby) => void;
  public onGameStarted?: (lobby: ActiveLobby) => void;
  public onPilotMoved?: (update: RemotePilotUpdate) => void;
  public onPilotFired?: (event: RemoteFireEvent) => void;
  public onChatReceived?: (msg: ChatMessage) => void;
  public onError?: (msg: string) => void;

  private pendingQueue: any[] = [];
  private lastSyncTime: number = 0;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${proto}//${host}/ws/multiplayer`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Flush pending queue
        while (this.pendingQueue.length > 0) {
          const item = this.pendingQueue.shift();
          this.send(item.type, item.payload);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const { type, payload, message } = JSON.parse(event.data);
          this.handleMessage(type, payload, message);
        } catch (e) {
          console.error('WS message error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // Auto-reconnect after 2 seconds
        setTimeout(() => this.connect(), 2000);
      };

      this.ws.onerror = (err) => {
        console.error('WS client error:', err);
      };
    } catch (e) {
      console.error('WebSocket connection setup failed:', e);
    }
  }

  private send(type: string, payload?: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingQueue.push({ type, payload });
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  private handleMessage(type: string, payload: any, message?: string) {
    switch (type) {
      case 'lobby_list':
        if (this.onLobbyList) this.onLobbyList(payload.lobbies || []);
        break;

      case 'lobby_joined':
        this.currentLobby = payload.lobby;
        this.selfPilotId = payload.selfPilotId;
        if (this.onLobbyJoined) this.onLobbyJoined(payload.lobby, payload.selfPilotId);
        break;

      case 'lobby_update':
        this.currentLobby = payload.lobby;
        if (this.onLobbyUpdate) this.onLobbyUpdate(payload.lobby);
        break;

      case 'game_started':
        this.currentLobby = payload.lobby;
        if (this.onGameStarted) this.onGameStarted(payload.lobby);
        break;

      case 'pilot_moved':
        if (this.onPilotMoved) this.onPilotMoved(payload);
        break;

      case 'pilot_fired':
        if (this.onPilotFired) this.onPilotFired(payload);
        break;

      case 'chat_received':
        if (this.onChatReceived) this.onChatReceived(payload);
        break;

      case 'error':
        if (this.onError) this.onError(message || 'An error occurred');
        break;
    }
  }

  public getLobbies() {
    this.send('get_lobbies');
  }

  public createLobby(name: string, isPrivate: boolean, maxPlayers: number, callSign: string, weapon: string) {
    this.send('create_lobby', { name, isPrivate, maxPlayers, callSign, weapon });
  }

  public joinLobby(lobbyId?: string, code?: string, callSign?: string, weapon?: string) {
    this.send('join_lobby', { lobbyId, code, callSign, weapon });
  }

  public toggleReady() {
    this.send('toggle_ready');
  }

  public startGame() {
    this.send('start_game');
  }

  public sendPlayerSync(
    x: number,
    y: number,
    angle: number,
    hp: number,
    maxHp: number,
    score: number,
    kills: number,
    isDashing: boolean
  ) {
    const now = performance.now();
    // Throttle send to ~30 fps
    if (now - this.lastSyncTime < 33) return;
    this.lastSyncTime = now;

    this.send('player_sync', { x, y, angle, hp, maxHp, score, kills, isDashing });
  }

  public sendPlayerFire(x: number, y: number, vx: number, vy: number, radius: number, color: string, weaponType: string) {
    this.send('player_fire', { x, y, vx, vy, radius, color, weaponType });
  }

  public sendChat(text: string) {
    if (!text.trim()) return;
    this.send('chat_message', { text: text.trim() });
  }

  public leaveLobby() {
    this.send('leave_lobby');
    this.currentLobby = null;
    this.selfPilotId = null;
  }
}

export const mpClient = new MultiplayerManager();
