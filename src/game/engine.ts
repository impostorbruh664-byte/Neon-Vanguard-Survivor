import { sound } from './audio';
import { GameState, PerkOption, PlayerStats, RunSummary, WeaponType } from './types';

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce: number;
  color: string;
  life: number;
  maxLife: number;
  isEnemy: boolean;
  type: 'bullet' | 'plasma' | 'tesla' | 'ring';
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  damage: number;
  color: string;
  type: 'drone' | 'cruiser' | 'charger' | 'boss';
  scoreValue: number;
  shootCooldown: number;
  // For charger windup
  telegraphTimer: number;
  chargeTargetX: number;
  chargeTargetY: number;
  isCharging: boolean;
  hitFlash: number;
}

interface Gem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  color: string;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  isCrit: boolean;
}

interface GhostTrail {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

export class NeonEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number = 0;
  private lastTime: number = 0;
  private isDestroyed: boolean = false;

  // Game state
  public state: GameState = 'TITLE';

  // World bounds
  public readonly worldWidth = 3200;
  public readonly worldHeight = 3200;

  // Camera
  private camX = 0;
  private camY = 0;
  private shakeIntensity = 0;
  private shakeDecay = 0.92;
  private hitstopTimer = 0;

  // Player
  private px = 1600;
  private py = 1600;
  private pvx = 0;
  private pvy = 0;
  private pAngle = 0;
  private pRadius = 14;
  private hp = 100;
  private maxHp = 100;
  private baseSpeed = 280;
  private speedMod = 1.0;
  private invulnTimer = 0;
  private dashCooldownTimer = 0;
  private dashDurationTimer = 0;
  private readonly dashMaxCooldown = 2.4;
  private readonly dashSpeed = 820;
  private ghostTrails: GhostTrail[] = [];
  private shieldBubble = 0; // absorb hits

  // Progression
  private score = 0;
  private wave = 1;
  private waveTimer = 0;
  private readonly waveDuration = 45; // 45s per wave
  private kills = 0;
  private totalRunTime = 0;
  private level = 1;
  private xp = 0;
  private xpToNext = 60;
  private damageMulti = 1.0;
  private critChance = 0.08;
  private firerateMulti = 1.0;
  private magnetRadius = 120;
  private healthRegen = 0; // hp per sec

  // Weapons & Perks
  private primaryWeapon: WeaponType = 'Hyper Blaster';
  private secondaryWeapons: Set<WeaponType> = new Set();
  private shootCooldown = 0;
  private teslaCooldown = 0;
  private plasmaCooldown = 0;
  private orbitalAngle = 0;
  private orbitalCount = 0;
  private activePerks: Map<string, PerkOption> = new Map();

  // Admin Cheats & God Tools
  public godMode = false;
  public infiniteDash = false;
  public hyperOverclock = false;
  public infiniteMagnet = false;
  public enableAdminHotkeys = true;

  // Entities
  private projectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private gems: Gem[] = [];
  private particles: Particle[] = [];
  private damageNumbers: DamageNumber[] = [];
  private stars: { x: number; y: number; size: number; alpha: number }[] = [];

  // Input
  private keys: Record<string, boolean> = {};
  private mouseX = 0;
  private mouseY = 0;
  private isMouseDown = false;
  private enemyIdCounter = 1;

  // React Callbacks
  public onStateChange?: (state: GameState) => void;
  public onStatsUpdate?: (stats: PlayerStats) => void;
  public onPerkOptions?: (options: PerkOption[]) => void;
  public onRunEnd?: (summary: RunSummary) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot get 2d context');
    this.ctx = context;

    this.initStars();
    this.setupInputs();
    this.resizeCanvas();
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.resizeCanvas();
  };

  private resizeCanvas() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 400; i++) {
      this.stars.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight,
        size: Math.random() * 2 + 0.6,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  private setupInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    this.keys[e.code] = true;

    // Start on Space / Enter from Title
    if (this.state === 'TITLE' && (e.code === 'Space' || e.code === 'Enter')) {
      this.startGame();
      return;
    }

    // Pause on Escape
    if (e.code === 'Escape') {
      if (this.state === 'PLAYING') {
        this.setState('PAUSED');
      } else if (this.state === 'PAUSED') {
        this.setState('PLAYING');
      }
    }

    // Dash on Space / Shift during playing
    if (this.state === 'PLAYING' && (e.code === 'Space' || e.code === 'ShiftLeft')) {
      this.triggerDash();
    }

    // Admin Cheat Hotkeys during active gameplay
    if (this.enableAdminHotkeys && this.state === 'PLAYING') {
      const k = e.key.toLowerCase();
      if (k === 'g') {
        this.toggleGodMode();
      } else if (k === 'n') {
        this.triggerScreenNuke();
      } else if (k === 'l') {
        this.addInstantLevels(1);
      } else if (k === 'h') {
        this.fullHeal();
      } else if (k === 'm') {
        this.toggleInfiniteMagnet();
      } else if (k === 'o') {
        this.toggleHyperOverclock();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
    this.keys[e.code] = false;
  };

  private handleBlur = () => {
    this.keys = {};
    this.isMouseDown = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
      if (this.state === 'TITLE') {
        this.startGame();
      }
    } else if (e.button === 2) {
      if (this.state === 'PLAYING') {
        this.triggerDash();
      }
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  };

  public setState(newState: GameState) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  public startGame(initialWeapon: WeaponType = 'Hyper Blaster') {
    this.primaryWeapon = initialWeapon;
    this.secondaryWeapons.clear();
    this.activePerks.clear();

    // Reset stats
    this.px = this.worldWidth / 2;
    this.py = this.worldHeight / 2;
    this.pvx = 0;
    this.pvy = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.score = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.kills = 0;
    this.totalRunTime = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 45;
    this.speedMod = 1.0;
    this.damageMulti = 1.0;
    this.firerateMulti = 1.0;
    this.critChance = 0.08;
    this.magnetRadius = 140;
    this.healthRegen = 0;
    this.shieldBubble = 0;
    this.orbitalCount = 0;

    // Reset pools
    this.projectiles = [];
    this.enemies = [];
    this.gems = [];
    this.particles = [];
    this.damageNumbers = [];
    this.ghostTrails = [];
    this.dashCooldownTimer = 0;
    this.dashDurationTimer = 0;
    this.invulnTimer = 0;

    // Initial Weapon Perk
    this.registerPerk({
      id: 'wpn_' + initialWeapon.toLowerCase().replace(' ', '_'),
      name: initialWeapon,
      category: 'weapon',
      tier: 'epic',
      description: 'Primary vanguard ordinance matrix',
      currentLevel: 1,
      maxLevel: 5,
      icon: 'zap'
    });

    this.setState('PLAYING');
    sound.playLevelUp();
    this.publishStats();
  }

  public restartGame() {
    this.startGame(this.primaryWeapon);
  }

  // ================= ADMIN CHEAT METHODS =================

  public toggleGodMode(): boolean {
    this.godMode = !this.godMode;
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 30,
      text: this.godMode ? '★ CHEAT: GOD MODE [ACTIVE]' : 'CHEAT: GOD MODE [DISABLED]',
      color: this.godMode ? '#facc15' : '#94a3b8',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
    return this.godMode;
  }

  public toggleInfiniteDash(): boolean {
    this.infiniteDash = !this.infiniteDash;
    if (this.infiniteDash) this.dashCooldownTimer = 0;
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 30,
      text: this.infiniteDash ? '★ CHEAT: ZERO CD DASH [ACTIVE]' : 'CHEAT: ZERO CD DASH [DISABLED]',
      color: this.infiniteDash ? '#38bdf8' : '#94a3b8',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
    return this.infiniteDash;
  }

  public toggleHyperOverclock(): boolean {
    this.hyperOverclock = !this.hyperOverclock;
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 30,
      text: this.hyperOverclock ? '★ CHEAT: HYPER OVERCLOCK [ACTIVE]' : 'CHEAT: HYPER OVERCLOCK [DISABLED]',
      color: this.hyperOverclock ? '#f43f5e' : '#94a3b8',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
    return this.hyperOverclock;
  }

  public toggleInfiniteMagnet(): boolean {
    this.infiniteMagnet = !this.infiniteMagnet;
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 30,
      text: this.infiniteMagnet ? '★ CHEAT: GRAVITON VORTEX [ACTIVE]' : 'CHEAT: GRAVITON VORTEX [DISABLED]',
      color: this.infiniteMagnet ? '#c084fc' : '#94a3b8',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
    return this.infiniteMagnet;
  }

  public triggerScreenNuke(): void {
    sound.playExplosion(true);
    this.addCameraShake(22);
    this.hitstopTimer = 0.08;

    const killCount = this.enemies.length;
    for (const e of [...this.enemies]) {
      this.defeatEnemy(e);
    }

    // Spawn massive shockwave particles
    for (let i = 0; i < 64; i++) {
      const ang = (i * Math.PI * 2) / 64;
      const spd = Math.random() * 320 + 150;
      this.particles.push({
        x: this.px,
        y: this.py,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: Math.random() * 6 + 3,
        color: i % 2 === 0 ? '#38bdf8' : '#ffffff',
        alpha: 1,
        life: 0,
        maxLife: 0.8
      });
    }

    this.damageNumbers.push({
      x: this.px,
      y: this.py - 45,
      text: `☢ TACTICAL ION NUKE: ${killCount} SWARMS WIPED!`,
      color: '#38bdf8',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
  }

  public maxAllPerks(): void {
    const perksToMax: PerkOption[] = [
      { id: 'wpn_hyper_blaster', name: 'Hyper Blaster', category: 'weapon', tier: 'epic', description: 'Primary vanguard ordinance matrix', currentLevel: 5, maxLevel: 5, icon: 'zap' },
      { id: 'wpn_plasma_burst', name: 'Plasma Burst', category: 'weapon', tier: 'epic', description: 'Heavy area cannon', currentLevel: 5, maxLevel: 5, icon: 'bomb' },
      { id: 'wpn_tesla_arc', name: 'Tesla Arc', category: 'weapon', tier: 'rare', description: 'Chain lightning', currentLevel: 5, maxLevel: 5, icon: 'zap' },
      { id: 'wpn_orbital_blades', name: 'Orbital Blades', category: 'weapon', tier: 'epic', description: 'Spinning photon cutters', currentLevel: 5, maxLevel: 5, icon: 'shield' },
      { id: 'perk_overclock', name: 'Overclock Core', category: 'passive', tier: 'common', description: 'Fire rate boost', currentLevel: 5, maxLevel: 5, icon: 'gauge' },
      { id: 'perk_titan_plating', name: 'Titan Plating', category: 'passive', tier: 'rare', description: 'Hull density', currentLevel: 5, maxLevel: 5, icon: 'shield-alert' },
      { id: 'perk_nanorepair', name: 'Nano Repair Matrix', category: 'passive', tier: 'rare', description: 'Health regen', currentLevel: 5, maxLevel: 5, icon: 'heart-pulse' },
      { id: 'perk_warpdrive', name: 'Sub-Light Boosters', category: 'passive', tier: 'common', description: 'Cruise speed', currentLevel: 5, maxLevel: 5, icon: 'wind' },
      { id: 'perk_fluxmagnet', name: 'Graviton Attractor', category: 'passive', tier: 'common', description: 'Crystal magnet', currentLevel: 5, maxLevel: 5, icon: 'magnet' },
      { id: 'perk_crit_lens', name: 'Precision Targeting', category: 'passive', tier: 'legendary', description: 'Critical strike', currentLevel: 5, maxLevel: 5, icon: 'crosshair' },
      { id: 'perk_aegis_bubble', name: 'Aegis Shield Core', category: 'passive', tier: 'legendary', description: 'Hull shield', currentLevel: 3, maxLevel: 3, icon: 'disc' }
    ];

    for (const p of perksToMax) {
      this.activePerks.set(p.id, p);
      this.applyPerkEffect(p);
    }
    this.hp = this.maxHp;
    this.shieldBubble = 3;
    sound.playLevelUp();

    this.damageNumbers.push({
      x: this.px,
      y: this.py - 40,
      text: '⚡ CHEAT: ALL WEAPONS & TECH MAXED!',
      color: '#a855f7',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
  }

  public addInstantLevels(count = 3): void {
    this.level += count;
    this.score += 15000 * count;
    this.hp = this.maxHp;
    sound.playLevelUp();
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 30,
      text: `★ CHEAT: +${count} LEVELS GRANTED!`,
      color: '#34d399',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
  }

  public fullHeal(): void {
    this.hp = this.maxHp;
    this.shieldBubble = 3;
    sound.playLevelUp();
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 30,
      text: '🛡 CHEAT: HULL REPAIRED & SHIELDS MAXED',
      color: '#38bdf8',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
  }

  public advanceWave(amount = 1): void {
    this.wave += amount;
    this.waveTimer = 0;
    this.score += 5000 * amount;
    sound.playBossAlert();
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 30,
      text: `⏩ CHEAT: ADVANCED TO WAVE ${this.wave}`,
      color: '#fbbf24',
      alpha: 1,
      life: 0,
      isCrit: true
    });
    this.publishStats();
  }

  public spawnInstantBoss(): void {
    this.spawnBoss(this.wave);
  }

  private triggerDash() {
    if (!this.infiniteDash && (this.dashCooldownTimer > 0 || this.dashDurationTimer > 0)) return;

    // Direction vector from input or current angle
    let dx = 0;
    let dy = 0;
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    let dashAngle = this.pAngle;
    if (dx !== 0 || dy !== 0) {
      dashAngle = Math.atan2(dy, dx);
    }

    this.pvx = Math.cos(dashAngle) * this.dashSpeed;
    this.pvy = Math.sin(dashAngle) * this.dashSpeed;
    this.dashDurationTimer = 0.22;
    this.dashCooldownTimer = this.infiniteDash ? 0 : this.dashMaxCooldown;
    this.invulnTimer = 0.28;

    sound.playDash();
    this.addCameraShake(5);

    // Particle burst
    for (let i = 0; i < 16; i++) {
      const spd = Math.random() * 140 + 40;
      const ang = dashAngle + Math.PI + (Math.random() - 0.5) * 1.2;
      this.particles.push({
        x: this.px,
        y: this.py,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: Math.random() * 3 + 2,
        color: '#38bdf8',
        alpha: 0.9,
        life: 0,
        maxLife: 0.35
      });
    }
  }

  private registerPerk(perk: PerkOption) {
    this.activePerks.set(perk.id, perk);
    this.applyPerkEffect(perk);
  }

  public selectPerk(perk: PerkOption) {
    const existing = this.activePerks.get(perk.id);
    if (existing) {
      existing.currentLevel = Math.min(existing.maxLevel, existing.currentLevel + 1);
      this.applyPerkEffect(existing);
    } else {
      this.registerPerk(perk);
    }

    sound.playLevelUp();
    this.setState('PLAYING');
    this.publishStats();
  }

  private applyPerkEffect(perk: PerkOption) {
    const lvl = perk.currentLevel;
    switch (perk.id) {
      case 'wpn_hyper_blaster':
        this.firerateMulti = 1.0 + lvl * 0.2;
        break;
      case 'wpn_plasma_burst':
        this.secondaryWeapons.add('Plasma Burst');
        this.damageMulti = 1.0 + (lvl - 1) * 0.25;
        break;
      case 'wpn_tesla_arc':
        this.secondaryWeapons.add('Tesla Arc');
        break;
      case 'wpn_orbital_blades':
        this.secondaryWeapons.add('Orbital Blades');
        this.orbitalCount = 2 + lvl;
        break;
      case 'perk_overclock':
        this.firerateMulti += 0.25;
        break;
      case 'perk_titan_plating':
        this.maxHp += 35;
        this.hp = Math.min(this.maxHp, this.hp + 35);
        break;
      case 'perk_nanorepair':
        this.healthRegen = lvl * 2.2;
        break;
      case 'perk_warpdrive':
        this.speedMod = 1.0 + lvl * 0.18;
        break;
      case 'perk_fluxmagnet':
        this.magnetRadius = 140 + lvl * 80;
        break;
      case 'perk_crit_lens':
        this.critChance = 0.08 + lvl * 0.12;
        break;
      case 'perk_aegis_bubble':
        this.shieldBubble = Math.min(3, this.shieldBubble + 1);
        break;
    }
  }

  private generatePerkChoices(): PerkOption[] {
    const pool: PerkOption[] = [
      {
        id: 'wpn_plasma_burst',
        name: 'Plasma Burst',
        category: 'weapon',
        tier: 'epic',
        description: 'Launches heavy spherical plasma cannons that detonate into fiery area explosions.',
        currentLevel: this.activePerks.get('wpn_plasma_burst')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'bomb'
      },
      {
        id: 'wpn_tesla_arc',
        name: 'Tesla Arc',
        category: 'weapon',
        tier: 'rare',
        description: 'Emits continuous high-voltage lightning arcs that leap between enemy swarms.',
        currentLevel: this.activePerks.get('wpn_tesla_arc')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'zap'
      },
      {
        id: 'wpn_orbital_blades',
        name: 'Orbital Blades',
        category: 'weapon',
        tier: 'epic',
        description: 'Spins razor-sharp photon cutters in orbit around your ship, slicing approaching enemies.',
        currentLevel: this.activePerks.get('wpn_orbital_blades')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'shield'
      },
      {
        id: 'perk_overclock',
        name: 'Overclock Core',
        category: 'passive',
        tier: 'common',
        description: 'Overclocks weapons cooling manifold, increasing fire rate and discharge frequency by +25%.',
        currentLevel: this.activePerks.get('perk_overclock')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'gauge'
      },
      {
        id: 'perk_titan_plating',
        name: 'Titan Plating',
        category: 'passive',
        tier: 'rare',
        description: 'Reinforces hull structural density with dense nano-alloys (+35 Max HP & instant repair).',
        currentLevel: this.activePerks.get('perk_titan_plating')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'shield-alert'
      },
      {
        id: 'perk_nanorepair',
        name: 'Nano Repair Matrix',
        category: 'passive',
        tier: 'rare',
        description: 'Continuous nanite swarms reconstruct hull damage in real time (+2.2 HP/sec).',
        currentLevel: this.activePerks.get('perk_nanorepair')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'heart-pulse'
      },
      {
        id: 'perk_warpdrive',
        name: 'Sub-Light Boosters',
        category: 'passive',
        tier: 'common',
        description: 'Increases ship maneuvering thrusters and top cruise speed by +18%.',
        currentLevel: this.activePerks.get('perk_warpdrive')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'wind'
      },
      {
        id: 'perk_fluxmagnet',
        name: 'Graviton Attractor',
        category: 'passive',
        tier: 'common',
        description: 'Expands energy crystal gravity vacuum radius significantly (+80px reach).',
        currentLevel: this.activePerks.get('perk_fluxmagnet')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'magnet'
      },
      {
        id: 'perk_crit_lens',
        name: 'Precision Targeting',
        category: 'passive',
        tier: 'legendary',
        description: 'Optical guidance arrays amplify critical strike probability (+12% Crit, 2x damage).',
        currentLevel: this.activePerks.get('perk_crit_lens')?.currentLevel || 0,
        maxLevel: 5,
        icon: 'crosshair'
      },
      {
        id: 'perk_aegis_bubble',
        name: 'Aegis Shield Core',
        category: 'passive',
        tier: 'legendary',
        description: 'Generates an energy barrier that completely nullifies incoming hull impacts.',
        currentLevel: this.activePerks.get('perk_aegis_bubble')?.currentLevel || 0,
        maxLevel: 3,
        icon: 'disc'
      }
    ];

    // Filter available options that aren't at max level
    const available = pool.filter(p => {
      const cur = this.activePerks.get(p.id);
      return !cur || cur.currentLevel < cur.maxLevel;
    });

    // Shuffle and pick 3
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  private triggerLevelUp() {
    this.level += 1;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.round(this.xpToNext * 1.35 + 20);

    sound.playLevelUp();
    this.addCameraShake(6);

    const choices = this.generatePerkChoices();
    if (choices.length > 0) {
      this.setState('PERK_SELECTION');
      if (this.onPerkOptions) {
        this.onPerkOptions(choices);
      }
    } else {
      // Maxed out all perks: heal to max and give bonus score
      this.hp = this.maxHp;
      this.score += 5000;
      this.publishStats();
    }
  }

  private addCameraShake(intensity: number) {
    this.shakeIntensity = Math.min(24, this.shakeIntensity + intensity);
  }

  public startLoop() {
    this.lastTime = performance.now();
    const frame = (time: number) => {
      if (this.isDestroyed) return;
      const rawDt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      // Clamp delta time to avoid frame spiral
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.render();

      this.animId = requestAnimationFrame(frame);
    };
    this.animId = requestAnimationFrame(frame);
  }

  private update(dt: number) {
    // Screen shake decay
    if (this.shakeIntensity > 0.05) {
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    // Hitstop freeze handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.state === 'TITLE') {
      // Autonomous background demo flight
      this.updateTitleDemo(dt);
      return;
    }

    if (this.state !== 'PLAYING') return;

    this.totalRunTime += dt;
    this.waveTimer += dt;

    // Wave Progression
    if (this.waveTimer >= this.waveDuration) {
      this.waveTimer = 0;
      this.wave += 1;
      this.score += 2500 * this.wave;
      this.spawnBoss(this.wave);
      this.publishStats();
    }

    // Health Regeneration
    if (this.healthRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.healthRegen * dt);
    }

    // Invulnerability & Cooldowns
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.dashDurationTimer > 0) {
      this.dashDurationTimer -= dt;
      // Spawn chromatic after-image ghost
      if (Math.random() < 0.6) {
        this.ghostTrails.push({
          x: this.px,
          y: this.py,
          angle: this.pAngle,
          alpha: 0.6
        });
      }
    }

    // Update ghost trails
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      this.ghostTrails[i].alpha -= dt * 3.5;
      if (this.ghostTrails[i].alpha <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }

    // Update Player Movement
    this.updatePlayerMovement(dt);

    // Update Weapons & Projectiles
    this.updateWeapons(dt);

    // Spawn & Update Enemies
    this.updateSpawns(dt);
    this.updateEnemies(dt);

    // Update Gems & Magnet Attraction
    this.updateGems(dt);

    // Update Particles
    this.updateParticles(dt);

    // Update Damage Numbers
    this.updateDamageNumbers(dt);

    // Smooth Camera Follow
    const targetCamX = this.px - window.innerWidth / 2;
    const targetCamY = this.py - window.innerHeight / 2;
    this.camX += (targetCamX - this.camX) * 0.12;
    this.camY += (targetCamY - this.camY) * 0.12;

    // Periodic Stats Sync to UI
    if (Math.floor(this.totalRunTime * 10) % 5 === 0) {
      this.publishStats();
    }
  }

  private updateTitleDemo(dt: number) {
    this.totalRunTime += dt;
    // Gentle circular wander
    this.pAngle += dt * 0.4;
    this.px = this.worldWidth / 2 + Math.cos(this.totalRunTime * 0.3) * 350;
    this.py = this.worldHeight / 2 + Math.sin(this.totalRunTime * 0.25) * 280;

    this.camX = this.px - window.innerWidth / 2;
    this.camY = this.py - window.innerHeight / 2;

    // Spawn ambient demo drones
    if (this.enemies.length < 18 && Math.random() < 0.04) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 500 + 300;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: this.px + Math.cos(angle) * dist,
        y: this.py + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 12,
        speed: 100,
        hp: 30,
        maxHp: 30,
        damage: 10,
        color: '#f43f5e',
        type: 'drone',
        scoreValue: 50,
        shootCooldown: 2,
        telegraphTimer: 0,
        chargeTargetX: 0,
        chargeTargetY: 0,
        isCharging: false,
        hitFlash: 0
      });
    }

    // Auto-fire demo lasers
    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    } else {
      this.shootCooldown = 0.25;
      const target = this.enemies[0];
      if (target) {
        const aimAngle = Math.atan2(target.y - this.py, target.x - this.px);
        this.pAngle = aimAngle;
        this.projectiles.push({
          x: this.px,
          y: this.py,
          vx: Math.cos(aimAngle) * 750,
          vy: Math.sin(aimAngle) * 750,
          radius: 4,
          damage: 25,
          pierce: 1,
          color: '#38bdf8',
          life: 0,
          maxLife: 1.2,
          isEnemy: false,
          type: 'bullet'
        });
      }
    }

    this.updateEnemies(dt);
    this.updateParticles(dt);
  }

  private updatePlayerMovement(dt: number) {
    if (this.dashDurationTimer <= 0) {
      let dx = 0;
      let dy = 0;
      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;

      // Normalize diagonal
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      const targetSpeed = this.baseSpeed * this.speedMod;
      const accel = 18.0;
      this.pvx += (dx * targetSpeed - this.pvx) * Math.min(1, accel * dt);
      this.pvy += (dy * targetSpeed - this.pvy) * Math.min(1, accel * dt);
    }

    this.px += this.pvx * dt;
    this.py += this.pvy * dt;

    // Boundaries
    this.px = Math.max(40, Math.min(this.worldWidth - 40, this.px));
    this.py = Math.max(40, Math.min(this.worldHeight - 40, this.py));

    // Player aim angle towards mouse cursor in world coordinates
    const worldMouseX = this.mouseX + this.camX;
    const worldMouseY = this.mouseY + this.camY;
    this.pAngle = Math.atan2(worldMouseY - this.py, worldMouseX - this.px);

    // Engine exhaust particles
    if (Math.abs(this.pvx) > 20 || Math.abs(this.pvy) > 20) {
      if (Math.random() < 0.7) {
        const exhaustAngle = Math.atan2(this.pvy, this.pvx) + Math.PI + (Math.random() - 0.5) * 0.6;
        const spd = Math.random() * 50 + 20;
        this.particles.push({
          x: this.px - Math.cos(this.pAngle) * 12,
          y: this.py - Math.sin(this.pAngle) * 12,
          vx: Math.cos(exhaustAngle) * spd,
          vy: Math.sin(exhaustAngle) * spd,
          radius: Math.random() * 2.5 + 1,
          color: Math.random() < 0.5 ? '#38bdf8' : '#818cf8',
          alpha: 0.8,
          life: 0,
          maxLife: 0.25
        });
      }
    }
  }

  private updateWeapons(dt: number) {
    const rateMulti = this.hyperOverclock ? this.firerateMulti * 4.5 : this.firerateMulti;

    // 1. Primary Blaster / Continuous Fire
    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    } else {
      const baseDelay = 0.22 / rateMulti;
      this.shootCooldown = baseDelay;

      // Auto-aim nearest or cursor
      let fireAngle = this.pAngle;
      const nearest = this.getNearestEnemy(this.px, this.py);
      if (nearest && !this.isMouseDown) {
        fireAngle = Math.atan2(nearest.y - this.py, nearest.x - this.px);
      }

      // Projectiles based on upgrade level
      const blasterPerk = this.activePerks.get('wpn_hyper_blaster');
      const lvl = blasterPerk ? blasterPerk.currentLevel : 1;

      if (lvl === 1) {
        this.fireBlasterBolt(fireAngle, 0);
      } else if (lvl === 2) {
        this.fireBlasterBolt(fireAngle, -0.08);
        this.fireBlasterBolt(fireAngle, 0.08);
      } else {
        this.fireBlasterBolt(fireAngle, -0.15);
        this.fireBlasterBolt(fireAngle, 0);
        this.fireBlasterBolt(fireAngle, 0.15);
      }
      sound.playShoot(this.hyperOverclock ? 1.4 : 1.0);
    }

    // 2. Plasma Cannon (AoE)
    if (this.secondaryWeapons.has('Plasma Burst')) {
      if (this.plasmaCooldown > 0) {
        this.plasmaCooldown -= dt;
      } else {
        this.plasmaCooldown = 1.3 / rateMulti;
        const target = this.getNearestEnemy(this.px, this.py, 600);
        if (target) {
          const ang = Math.atan2(target.y - this.py, target.x - this.px);
          this.projectiles.push({
            x: this.px,
            y: this.py,
            vx: Math.cos(ang) * 550,
            vy: Math.sin(ang) * 550,
            radius: 9,
            damage: 90 * this.damageMulti * (this.hyperOverclock ? 2.5 : 1.0),
            pierce: 1,
            color: '#f97316',
            life: 0,
            maxLife: 1.5,
            isEnemy: false,
            type: 'plasma'
          });
          sound.playPlasma();
        }
      }
    }

    // 3. Tesla Arc (Chain lightning)
    if (this.secondaryWeapons.has('Tesla Arc')) {
      if (this.teslaCooldown > 0) {
        this.teslaCooldown -= dt;
      } else {
        this.teslaCooldown = 0.95 / rateMulti;
        this.triggerTeslaStrike();
      }
    }

    // 4. Orbital Photon Discs rotation
    if (this.secondaryWeapons.has('Orbital Blades') && this.orbitalCount > 0) {
      this.orbitalAngle += dt * 3.2;
      const orbitRadius = 75;

      for (let i = 0; i < this.orbitalCount; i++) {
        const bladeAngle = this.orbitalAngle + (i * Math.PI * 2) / this.orbitalCount;
        const bx = this.px + Math.cos(bladeAngle) * orbitRadius;
        const by = this.py + Math.sin(bladeAngle) * orbitRadius;

        // Check collision with nearby enemies
        for (const e of this.enemies) {
          const dist = Math.hypot(e.x - bx, e.y - by);
          if (dist < e.radius + 14) {
            this.damageEnemy(e, 45 * this.damageMulti * (this.hyperOverclock ? 3.0 : 1.0) * dt * 4, false, '#38bdf8');
          }
        }
      }
    }

    // Update in-flight projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life >= p.maxLife) {
        if (p.type === 'plasma') {
          this.detonatePlasma(p.x, p.y, p.damage);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision
      if (!p.isEnemy) {
        let hit = false;
        for (const e of this.enemies) {
          const dist = Math.hypot(e.x - p.x, e.y - p.y);
          if (dist < e.radius + p.radius) {
            hit = true;
            const isCrit = this.hyperOverclock || Math.random() < this.critChance;
            const dmg = p.damage * (isCrit ? 2.0 : 1.0);
            this.damageEnemy(e, dmg, isCrit, p.color);

            p.pierce -= 1;
            if (p.type === 'plasma') {
              this.detonatePlasma(p.x, p.y, p.damage);
            }

            if (p.pierce <= 0) break;
          }
        }
        if (hit && p.pierce <= 0) {
          this.projectiles.splice(i, 1);
        }
      } else {
        // Enemy bullet hitting player
        const distToPlayer = Math.hypot(this.px - p.x, this.py - p.y);
        if (distToPlayer < this.pRadius + p.radius) {
          this.damagePlayer(p.damage);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private fireBlasterBolt(angle: number, angleOffset: number) {
    const finalAngle = angle + angleOffset;
    const isCrit = this.hyperOverclock || Math.random() < this.critChance;
    this.projectiles.push({
      x: this.px + Math.cos(finalAngle) * 16,
      y: this.py + Math.sin(finalAngle) * 16,
      vx: Math.cos(finalAngle) * 820,
      vy: Math.sin(finalAngle) * 820,
      radius: this.hyperOverclock ? 6 : 4,
      damage: 32 * this.damageMulti * (this.hyperOverclock ? 3.0 : 1.0) * (isCrit ? 2.0 : 1.0),
      pierce: this.hyperOverclock ? 3 : 1,
      color: this.hyperOverclock ? '#f43f5e' : isCrit ? '#fbbf24' : '#38bdf8',
      life: 0,
      maxLife: 1.1,
      isEnemy: false,
      type: 'bullet'
    });
  }

  private detonatePlasma(x: number, y: number, damage: number) {
    sound.playPlasma();
    this.addCameraShake(4);

    const aoeRadius = 90;
    for (const e of this.enemies) {
      const dist = Math.hypot(e.x - x, e.y - y);
      if (dist < aoeRadius + e.radius) {
        this.damageEnemy(e, damage * 0.85, false, '#f97316');
      }
    }

    // Explosion particles
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 160 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: Math.random() * 4 + 2,
        color: Math.random() < 0.5 ? '#f97316' : '#eab308',
        alpha: 0.9,
        life: 0,
        maxLife: 0.4
      });
    }
  }

  private triggerTeslaStrike() {
    const sorted = [...this.enemies]
      .filter(e => Math.hypot(e.x - this.px, e.y - this.py) < 420)
      .sort((a, b) => Math.hypot(a.x - this.px, a.y - this.py) - Math.hypot(b.x - this.px, b.y - this.py));

    if (sorted.length === 0) return;

    sound.playTesla();
    const chainTargets = sorted.slice(0, 4);
    let prevX = this.px;
    let prevY = this.py;

    for (const target of chainTargets) {
      this.damageEnemy(target, 48 * this.damageMulti, false, '#a855f7');

      // Visual lightning sparks between links
      for (let s = 0; s < 5; s++) {
        const lerpT = s / 5;
        const lx = prevX + (target.x - prevX) * lerpT + (Math.random() - 0.5) * 20;
        const ly = prevY + (target.y - prevY) * lerpT + (Math.random() - 0.5) * 20;
        this.particles.push({
          x: lx,
          y: ly,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          radius: 2,
          color: '#c084fc',
          alpha: 1,
          life: 0,
          maxLife: 0.18
        });
      }

      prevX = target.x;
      prevY = target.y;
    }
  }

  private updateSpawns(dt: number) {
    // Enemy target density scales with wave
    const targetEnemyCount = Math.min(120, 20 + this.wave * 12);
    if (this.enemies.length >= targetEnemyCount) return;

    // Spawn around camera perimeter
    if (Math.random() < 0.08 + this.wave * 0.02) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(window.innerWidth, window.innerHeight) * 0.65;
      const sx = this.px + Math.cos(angle) * spawnDist;
      const sy = this.py + Math.sin(angle) * spawnDist;

      // Select enemy type based on wave
      const roll = Math.random();
      let type: 'drone' | 'cruiser' | 'charger' = 'drone';

      if (this.wave >= 3 && roll < 0.25) {
        type = 'charger';
      } else if (this.wave >= 2 && roll < 0.45) {
        type = 'cruiser';
      }

      this.spawnEnemy(sx, sy, type);
    }
  }

  private spawnEnemy(x: number, y: number, type: 'drone' | 'cruiser' | 'charger') {
    const waveHpMod = 1 + (this.wave - 1) * 0.35;
    let radius = 12;
    let hp = 40 * waveHpMod;
    let speed = 145;
    let damage = 12;
    let color = '#f43f5e';
    let scoreVal = 50;

    if (type === 'cruiser') {
      radius = 18;
      hp = 110 * waveHpMod;
      speed = 90;
      damage = 18;
      color = '#06b6d4';
      scoreVal = 140;
    } else if (type === 'charger') {
      radius = 14;
      hp = 65 * waveHpMod;
      speed = 120;
      damage = 25;
      color = '#eab308';
      scoreVal = 180;
    }

    this.enemies.push({
      id: this.enemyIdCounter++,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      speed,
      hp,
      maxHp: hp,
      damage,
      color,
      type,
      scoreValue: scoreVal,
      shootCooldown: Math.random() * 2 + 1,
      telegraphTimer: 0,
      chargeTargetX: 0,
      chargeTargetY: 0,
      isCharging: false,
      hitFlash: 0
    });
  }

  private spawnBoss(waveNumber: number) {
    sound.playBossAlert();
    this.addCameraShake(10);

    const angle = Math.random() * Math.PI * 2;
    const dist = 650;
    const bx = this.px + Math.cos(angle) * dist;
    const by = this.py + Math.sin(angle) * dist;

    const bossHp = 800 + waveNumber * 500;
    this.enemies.push({
      id: this.enemyIdCounter++,
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      radius: 36,
      speed: 70,
      hp: bossHp,
      maxHp: bossHp,
      damage: 35,
      color: '#dc2626',
      type: 'boss',
      scoreValue: 5000 * waveNumber,
      shootCooldown: 1.5,
      telegraphTimer: 0,
      chargeTargetX: 0,
      chargeTargetY: 0,
      isCharging: false,
      hitFlash: 0
    });

    this.damageNumbers.push({
      x: this.px,
      y: this.py - 60,
      text: `WARNING: OMEGA COLOSSUS TITAN DETECTED (WAVE ${waveNumber})`,
      color: '#ef4444',
      alpha: 1,
      life: 0,
      isCrit: true
    });
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;

      const distToPlayer = Math.hypot(this.px - e.x, this.py - e.y);
      const angleToPlayer = Math.atan2(this.py - e.y, this.px - e.x);

      // Behavior by type
      if (e.type === 'drone') {
        // Direct flocking
        e.vx = Math.cos(angleToPlayer) * e.speed;
        e.vy = Math.sin(angleToPlayer) * e.speed;
      } else if (e.type === 'cruiser') {
        // Keep mid-distance and shoot energy orbs
        if (distToPlayer > 260) {
          e.vx = Math.cos(angleToPlayer) * e.speed;
          e.vy = Math.sin(angleToPlayer) * e.speed;
        } else {
          // Circle around player
          const strafeAngle = angleToPlayer + Math.PI / 2;
          e.vx = Math.cos(strafeAngle) * (e.speed * 0.8);
          e.vy = Math.sin(strafeAngle) * (e.speed * 0.8);
        }

        // Fire enemy pulse
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && this.state === 'PLAYING') {
          e.shootCooldown = 2.4;
          this.projectiles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(angleToPlayer) * 220,
            vy: Math.sin(angleToPlayer) * 220,
            radius: 5,
            damage: 15,
            pierce: 1,
            color: '#06b6d4',
            life: 0,
            maxLife: 3.5,
            isEnemy: true,
            type: 'bullet'
          });
        }
      } else if (e.type === 'charger') {
        // Windup telegraph then hypersonic charge
        if (!e.isCharging) {
          if (e.telegraphTimer <= 0) {
            // Trigger telegraph
            if (distToPlayer < 400) {
              e.telegraphTimer = 0.85;
              e.chargeTargetX = this.px;
              e.chargeTargetY = this.py;
              e.vx = 0;
              e.vy = 0;
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
            }
          } else {
            // Charging windup (stationary telegraph)
            e.telegraphTimer -= dt;
            if (e.telegraphTimer <= 0) {
              e.isCharging = true;
              const chargeAngle = Math.atan2(e.chargeTargetY - e.y, e.chargeTargetX - e.x);
              e.vx = Math.cos(chargeAngle) * 480;
              e.vy = Math.sin(chargeAngle) * 480;
            }
          }
        } else {
          // Charging decay
          e.vx *= 0.98;
          e.vy *= 0.98;
          if (Math.hypot(e.vx, e.vy) < 80) {
            e.isCharging = false;
          }
        }
      } else if (e.type === 'boss') {
        // Colossus Boss: slow march + spiral bullet rings
        e.vx = Math.cos(angleToPlayer) * e.speed;
        e.vy = Math.sin(angleToPlayer) * e.speed;

        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && this.state === 'PLAYING') {
          e.shootCooldown = 1.8;
          sound.playShoot(0.6);
          // Ring of 8 bullets
          for (let b = 0; b < 8; b++) {
            const bAngle = (b * Math.PI * 2) / 8 + this.totalRunTime;
            this.projectiles.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(bAngle) * 190,
              vy: Math.sin(bAngle) * 190,
              radius: 6,
              damage: 20,
              pierce: 1,
              color: '#ef4444',
              life: 0,
              maxLife: 4.5,
              isEnemy: true,
              type: 'ring'
            });
          }
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Soft enemy-to-enemy push separation
      for (let j = i - 1; j >= 0; j--) {
        const other = this.enemies[j];
        const dx = other.x - e.x;
        const dy = other.y - e.y;
        const dist = Math.hypot(dx, dy);
        const minDist = e.radius + other.radius;
        if (dist < minDist && dist > 0.01) {
          const push = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          e.x -= nx * push;
          e.y -= ny * push;
          other.x += nx * push;
          other.y += ny * push;
        }
      }

      // Check collision with player
      if (distToPlayer < e.radius + this.pRadius && this.state === 'PLAYING') {
        this.damagePlayer(e.damage);
      }
    }
  }

  private damageEnemy(e: Enemy, damage: number, isCrit: boolean, color: string) {
    e.hp -= damage;
    e.hitFlash = 0.08;

    // Damage popup
    this.damageNumbers.push({
      x: e.x + (Math.random() - 0.5) * 16,
      y: e.y - 12,
      text: `${Math.round(damage)}`,
      color: isCrit ? '#facc15' : color,
      alpha: 1,
      life: 0,
      isCrit
    });

    sound.playHit();

    // Check defeat
    if (e.hp <= 0) {
      this.defeatEnemy(e);
    }
  }

  private defeatEnemy(e: Enemy) {
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    this.kills += 1;
    this.score += e.scoreValue;

    const isLarge = e.type === 'boss';
    sound.playExplosion(isLarge);

    if (isLarge) {
      this.addCameraShake(14);
      this.hitstopTimer = 0.06; // brief hitstop
    } else {
      this.addCameraShake(2.5);
    }

    // Spawn Energy Crystal Gem
    const gemVal = e.type === 'boss' ? 80 : e.type === 'charger' ? 25 : e.type === 'cruiser' ? 20 : 10;
    this.gems.push({
      x: e.x,
      y: e.y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      value: gemVal,
      color: e.type === 'boss' ? '#fbbf24' : '#38bdf8',
      radius: e.type === 'boss' ? 7 : 4
    });

    // Death explosion particles
    const pCount = isLarge ? 32 : 12;
    for (let i = 0; i < pCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * (isLarge ? 220 : 120) + 30;
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: Math.random() * (isLarge ? 4 : 2.5) + 1,
        color: e.color,
        alpha: 1,
        life: 0,
        maxLife: isLarge ? 0.6 : 0.35
      });
    }
  }

  private damagePlayer(damage: number) {
    if (this.godMode) {
      if (Math.random() < 0.25) {
        this.damageNumbers.push({
          x: this.px,
          y: this.py - 24,
          text: 'GOD IMMUNITY',
          color: '#facc15',
          alpha: 1,
          life: 0,
          isCrit: true
        });
      }
      return;
    }
    if (this.invulnTimer > 0 || this.dashDurationTimer > 0) return;

    // Check Shield Core
    if (this.shieldBubble > 0) {
      this.shieldBubble -= 1;
      this.invulnTimer = 0.6;
      sound.playHit();
      this.damageNumbers.push({
        x: this.px,
        y: this.py - 20,
        text: 'SHIELD BLOCKED',
        color: '#38bdf8',
        alpha: 1,
        life: 0,
        isCrit: true
      });
      return;
    }

    this.hp -= damage;
    this.invulnTimer = 0.45;
    this.addCameraShake(8);
    this.hitstopTimer = 0.04;
    sound.playHit();

    // Damage number
    this.damageNumbers.push({
      x: this.px,
      y: this.py - 20,
      text: `-${Math.round(damage)}`,
      color: '#ef4444',
      alpha: 1,
      life: 0,
      isCrit: true
    });

    this.publishStats();

    if (this.hp <= 0) {
      this.hp = 0;
      this.triggerGameOver();
    }
  }

  private updateGems(dt: number) {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.95;
      g.vy *= 0.95;

      const dist = Math.hypot(this.px - g.x, this.py - g.y);
      const effectiveMagnet = this.infiniteMagnet ? 99999 : this.magnetRadius;

      if (dist < effectiveMagnet) {
        // Pull smoothly towards player (lightning fast if mega magnet)
        const angle = Math.atan2(this.py - g.y, this.px - g.x);
        const pullSpeed = this.infiniteMagnet ? 1600 : 480 + (this.magnetRadius - dist) * 2;
        g.x += Math.cos(angle) * pullSpeed * dt;
        g.y += Math.sin(angle) * pullSpeed * dt;

        // Pickup threshold
        if (dist < this.pRadius + g.radius + (this.infiniteMagnet ? 24 : 6)) {
          this.xp += g.value;
          this.score += g.value * 5;
          sound.playGem();
          this.gems.splice(i, 1);

          if (this.xp >= this.xpToNext) {
            this.triggerLevelUp();
          }
          this.publishStats();
        }
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateDamageNumbers(dt: number) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.life += dt;
      d.y -= 35 * dt;
      d.alpha = Math.max(0, 1 - d.life / 0.8);

      if (d.life >= 0.8) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private triggerGameOver() {
    this.setState('GAME_OVER');
    sound.playGameOver();

    if (this.onRunEnd) {
      this.onRunEnd({
        score: this.score,
        wave: this.wave,
        kills: this.kills,
        survivalSeconds: Math.round(this.totalRunTime),
        weapon: this.primaryWeapon,
        perksAcquired: this.activePerks.size,
        maxDps: Math.round(this.kills > 0 ? (this.score / Math.max(1, this.totalRunTime)) * 1.5 : 200)
      });
    }
  }

  private getNearestEnemy(x: number, y: number, maxDist = 99999): Enemy | null {
    let nearest: Enemy | null = null;
    let minD = maxDist;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < minD) {
        minD = d;
        nearest = e;
      }
    }
    return nearest;
  }

  private publishStats() {
    if (!this.onStatsUpdate) return;
    this.onStatsUpdate({
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: this.maxHp,
      speed: Math.round(this.baseSpeed * this.speedMod),
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      timeSeconds: Math.round(this.totalRunTime),
      dashCooldown: Math.max(0, this.dashCooldownTimer),
      dashReady: this.dashCooldownTimer <= 0,
      critChance: this.hyperOverclock ? 1.0 : this.critChance,
      damageMultiplier: this.hyperOverclock ? this.damageMulti * 2.5 : this.damageMulti,
      magnetRadius: this.infiniteMagnet ? 99999 : this.magnetRadius,
      activePerks: Array.from(this.activePerks.values()),
      primaryWeapon: this.primaryWeapon,
      cheats: {
        godMode: this.godMode,
        infiniteDash: this.infiniteDash,
        hyperOverclock: this.hyperOverclock,
        infiniteMagnet: this.infiniteMagnet
      }
    });
  }

  // ================= RENDERING =================

  private render() {
    const { ctx } = this;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.save();
    // Clear background
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, w, h);

    // Camera transform with shake
    const shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
    ctx.translate(-Math.round(this.camX + shakeOffsetX), -Math.round(this.camY + shakeOffsetY));

    // World Grid Lines
    this.renderGrid();

    // World Boundary Border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);

    // Energy Gems
    this.renderGems();

    // Ghost Trails
    this.renderGhostTrails();

    // Enemies & Telegraph lines
    this.renderEnemies();

    // Projectiles
    this.renderProjectiles();

    // Orbital Blades
    if (this.secondaryWeapons.has('Orbital Blades') && this.orbitalCount > 0) {
      this.renderOrbitals();
    }

    // Player Ship
    this.renderPlayer();

    // Particles
    this.renderParticles();

    // Damage text
    this.renderDamageNumbers();

    ctx.restore();
  }

  private renderGrid() {
    const { ctx } = this;
    const gridSize = 120;
    const startX = Math.floor(this.camX / gridSize) * gridSize;
    const startY = Math.floor(this.camY / gridSize) * gridSize;
    const endX = this.camX + window.innerWidth + gridSize;
    const endY = this.camY + window.innerHeight + gridSize;

    // Stars
    ctx.fillStyle = '#94a3b8';
    for (const star of this.stars) {
      if (
        star.x >= this.camX - 20 &&
        star.x <= this.camX + window.innerWidth + 20 &&
        star.y >= this.camY - 20 &&
        star.y <= this.camY + window.innerHeight + 20
      ) {
        ctx.globalAlpha = star.alpha;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }
    ctx.globalAlpha = 1.0;

    // Grid coordinates
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < endX; x += gridSize) {
      if (x >= 0 && x <= this.worldWidth) {
        ctx.moveTo(x, Math.max(0, this.camY));
        ctx.lineTo(x, Math.min(this.worldHeight, this.camY + window.innerHeight));
      }
    }
    for (let y = startY; y < endY; y += gridSize) {
      if (y >= 0 && y <= this.worldHeight) {
        ctx.moveTo(Math.max(0, this.camX), y);
        ctx.lineTo(Math.min(this.worldWidth, this.camX + window.innerWidth), y);
      }
    }
    ctx.stroke();
  }

  private renderPlayer() {
    const { ctx } = this;

    // Flash when invulnerable
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.px, this.py);
    ctx.rotate(this.pAngle);

    // Divine God Mode Aura
    if (this.godMode) {
      ctx.beginPath();
      ctx.arc(0, 0, this.pRadius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
      ctx.fill();
      ctx.stroke();

      // Rotating celestial pips
      for (let p = 0; p < 4; p++) {
        const pa = (p * Math.PI) / 2 + this.totalRunTime * 4;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(Math.cos(pa) * (this.pRadius + 14) - 2, Math.sin(pa) * (this.pRadius + 14) - 2, 4, 4);
      }
    }

    // Shield Bubble if active
    if (this.shieldBubble > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.pRadius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fill();
      ctx.stroke();
    }

    // Ship Hull (Sleek Vanguard Fighter)
    ctx.beginPath();
    ctx.moveTo(18, 0); // Nose
    ctx.lineTo(-12, -12); // Left wing
    ctx.lineTo(-6, 0); // Rear thruster notch
    ctx.lineTo(-12, 12); // Right wing
    ctx.closePath();

    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Cockpit glowing core
    ctx.beginPath();
    ctx.arc(2, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#67e8f9';
    ctx.fill();

    // Wing cannons
    ctx.fillStyle = '#818cf8';
    ctx.fillRect(-2, -11, 8, 2);
    ctx.fillRect(-2, 9, 8, 2);

    ctx.restore();
  }

  private renderGhostTrails() {
    const { ctx } = this;
    for (const trail of this.ghostTrails) {
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.angle);
      ctx.globalAlpha = trail.alpha * 0.7;

      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 12);
      ctx.closePath();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  private renderEnemies() {
    const { ctx } = this;

    for (const e of this.enemies) {
      // Charger warning telegraph line
      if (e.type === 'charger' && e.telegraphTimer > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.chargeTargetX, e.chargeTargetY);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(e.x, e.y);

      // Hit flash color
      const drawColor = e.hitFlash > 0 ? '#ffffff' : e.color;

      if (e.type === 'drone') {
        // Scythe Drone (Fast aggressive triangle)
        const angle = Math.atan2(e.vy, e.vx);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(e.radius * 1.2, 0);
        ctx.lineTo(-e.radius * 0.8, -e.radius * 0.8);
        ctx.lineTo(-e.radius * 0.4, 0);
        ctx.lineTo(-e.radius * 0.8, e.radius * 0.8);
        ctx.closePath();
        ctx.fillStyle = '#1e1b4b';
        ctx.fill();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (e.type === 'cruiser') {
        // Void Cruiser (Hexagonal armored ship)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const hx = Math.cos(a) * e.radius;
          const hy = Math.sin(a) * e.radius;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = '#083344';
        ctx.fill();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Core eye
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = drawColor;
        ctx.fill();
      } else if (e.type === 'charger') {
        // Pulse Charger (Wedge blade with glowing thruster)
        const angle = Math.atan2(e.vy || 1, e.vx || 0);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(e.radius * 1.4, 0);
        ctx.lineTo(-e.radius, -e.radius);
        ctx.lineTo(-e.radius * 0.5, 0);
        ctx.lineTo(-e.radius, e.radius);
        ctx.closePath();
        ctx.fillStyle = '#422006';
        ctx.fill();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (e.type === 'boss') {
        // Colossus Boss (Giant Dreadnought)
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + this.totalRunTime * 0.4;
          const bx = Math.cos(a) * e.radius;
          const by = Math.sin(a) * e.radius;
          if (i === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.closePath();
        ctx.fillStyle = '#450a0a';
        ctx.fill();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = drawColor;
        ctx.fill();
      }

      // Small health bar over heavy enemies and boss
      if (e.type === 'cruiser' || e.type === 'charger' || e.type === 'boss') {
        const barW = e.radius * 2;
        const barH = e.type === 'boss' ? 6 : 3;
        const barY = -e.radius - 8;
        const hpPercent = Math.max(0, e.hp / e.maxHp);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(-barW / 2, barY, barW, barH);
        ctx.fillStyle = e.type === 'boss' ? '#ef4444' : '#22c55e';
        ctx.fillRect(-barW / 2, barY, barW * hpPercent, barH);
      }

      ctx.restore();
    }
  }

  private renderProjectiles() {
    const { ctx } = this;
    for (const p of this.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  private renderOrbitals() {
    const { ctx } = this;
    const orbitRadius = 75;
    for (let i = 0; i < this.orbitalCount; i++) {
      const bladeAngle = this.orbitalAngle + (i * Math.PI * 2) / this.orbitalCount;
      const bx = this.px + Math.cos(bladeAngle) * orbitRadius;
      const by = this.py + Math.sin(bladeAngle) * orbitRadius;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(bladeAngle * 2);

      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Blade edges
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-9, -2, 18, 4);

      ctx.restore();
    }
  }

  private renderGems() {
    const { ctx } = this;
    for (const g of this.gems) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(Math.PI / 4);

      ctx.fillStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(-g.radius, -g.radius, g.radius * 2, g.radius * 2);
      ctx.restore();
    }
  }

  private renderParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  private renderDamageNumbers() {
    const { ctx } = this;
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    for (const d of this.damageNumbers) {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.shadowColor = d.color;
      ctx.shadowBlur = d.isCrit ? 8 : 2;
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.onResize);
  }
}
