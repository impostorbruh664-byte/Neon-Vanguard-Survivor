export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'PERK_SELECTION' | 'GAME_OVER' | 'VICTORY';

export type WeaponType = 'Hyper Blaster' | 'Plasma Burst' | 'Tesla Arc' | 'Orbital Blades';

export interface PerkOption {
  id: string;
  name: string;
  category: 'weapon' | 'passive';
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  currentLevel: number;
  maxLevel: number;
  icon: string;
}

export interface CheatStatus {
  godMode: boolean;
  infiniteDash: boolean;
  hyperOverclock: boolean;
  infiniteMagnet: boolean;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  xp: number;
  xpToNext: number;
  score: number;
  wave: number;
  kills: number;
  timeSeconds: number;
  dashCooldown: number;
  dashReady: boolean;
  critChance: number;
  damageMultiplier: number;
  magnetRadius: number;
  activePerks: PerkOption[];
  primaryWeapon: WeaponType;
  cheats: CheatStatus;
}

export interface RunSummary {
  score: number;
  wave: number;
  kills: number;
  survivalSeconds: number;
  weapon: WeaponType;
  perksAcquired: number;
  maxDps: number;
}
