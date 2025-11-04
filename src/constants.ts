export const CHAT_LINK_BUILD_TEMPLATE_TYPE = 0x0d;

export const SKILL_SLOT_ORDER = [
  { environment: 'terrestrial', slot: 'heal' },
  { environment: 'aquatic', slot: 'heal' },
  { environment: 'terrestrial', slot: 'utility', index: 0 },
  { environment: 'aquatic', slot: 'utility', index: 0 },
  { environment: 'terrestrial', slot: 'utility', index: 1 },
  { environment: 'aquatic', slot: 'utility', index: 1 },
  { environment: 'terrestrial', slot: 'utility', index: 2 },
  { environment: 'aquatic', slot: 'utility', index: 2 },
  { environment: 'terrestrial', slot: 'elite' },
  { environment: 'aquatic', slot: 'elite' }
] as const;

export const REVENANT_LEGEND_CODE_TO_NAME: Record<number, string> = {
  1: 'Legendary Dragon Stance',
  2: 'Legendary Assassin Stance',
  3: 'Legendary Dwarf Stance',
  4: 'Legendary Demon Stance',
  5: 'Legendary Renegade Stance',
  6: 'Legendary Centaur Stance',
  7: 'Legendary Alliance Stance (Archemorus)',
  8: 'Legendary Alliance Stance (Saint Viktor)'
};

export const REVENANT_LEGEND_ALIASES: Record<string, number> = {
  'legendary dragon stance': 1,
  glint: 1,
  'legendary assassin stance': 2,
  shiro: 2,
  'legendary dwarf stance': 3,
  jalis: 3,
  'legendary demon stance': 4,
  mallyx: 4,
  'legendary renegade stance': 5,
  kalla: 5,
  'legendary centaur stance': 6,
  ventari: 6,
  'legendary alliance stance': 7,
  archemorus: 7,
  viktor: 8,
  'saint viktor': 8,
  vindicator: 7,
  'legendary ritualist stance': 8
};

export const WEAPON_NAME_TO_ID: Record<string, number> = {
  axe: 5,
  longbow: 35,
  dagger: 47,
  focus: 49,
  greatsword: 50,
  hammer: 51,
  mace: 53,
  pistol: 54,
  rifle: 85,
  scepter: 86,
  shield: 87,
  staff: 89,
  sword: 90,
  torch: 102,
  warhorn: 103,
  shortbow: 107,
  spear: 265
};

export const WEAPON_ID_TO_NAME = Object.fromEntries(
  Object.entries(WEAPON_NAME_TO_ID).map(([name, id]) => [id, name])
) as Record<number, string>;

export const GW2_API_BASE = 'https://api.guildwars2.com/v2';

export const DEFAULT_USER_AGENT = 'gw2buildlink/0.1.0';
