export type TraitSelectionInput = number | string | null | undefined;

export interface SpecializationInput {
  id: number | string | null | undefined;
  traits?: [TraitSelectionInput?, TraitSelectionInput?, TraitSelectionInput?];
}

export type SkillInput = number | string | null | undefined;

export interface SkillSetInput {
  heal?: SkillInput;
  utilities?: [SkillInput?, SkillInput?, SkillInput?];
  elite?: SkillInput;
}

export interface BuildTemplateInput {
  profession: number | string;
  specializations: [SpecializationInput?, SpecializationInput?, SpecializationInput?];
  skills?: {
    terrestrial?: SkillSetInput;
    aquatic?: SkillSetInput;
  };
  rangerPets?: [number | string | null | undefined, number | string | null | undefined, number | string | null | undefined, number | string | null | undefined];
  revenantLegends?: [number | string | null | undefined, number | string | null | undefined, number | string | null | undefined, number | string | null | undefined];
  revenantInactiveSkills?: [SkillInput?, SkillInput?, SkillInput?, SkillInput?, SkillInput?, SkillInput?];
  weapons?: Array<number | string>;
  skillOverrides?: Array<number | string>;
}

export interface ProfessionSummary {
  id: string;
  name: string;
  code: number;
}

export interface TraitChoice {
  tier: 'adept' | 'master' | 'grandmaster';
  choice: number;
  traitId?: number;
  name?: string;
}

export interface DecodedSpecialization {
  id: number;
  name?: string;
  traits: TraitChoice[];
}

export interface DecodedSkill {
  environment: 'terrestrial' | 'aquatic';
  slot: 'heal' | 'utility' | 'elite';
  slotIndex?: number;
  paletteId: number;
  skillId?: number;
  name?: string;
}

export interface DecodedWeapon {
  id: number;
  name?: string;
}

export interface DecodedLegend {
  code: number;
  name?: string;
}

export interface DecodedBuildTemplate {
  profession: ProfessionSummary;
  specializations: DecodedSpecialization[];
  skills: {
    terrestrial: {
      heal: DecodedSkill;
      utilities: DecodedSkill[];
      elite: DecodedSkill;
    };
    aquatic: {
      heal: DecodedSkill;
      utilities: DecodedSkill[];
      elite: DecodedSkill;
    };
  };
  rangerPets?: Array<{ id: number; name?: string }>;
  revenantLegends?: DecodedLegend[];
  revenantInactiveSkills?: DecodedSkill[];
  weapons: DecodedWeapon[];
  skillOverrides: Array<{ id: number; name?: string }>;
}

export interface DecodeOptions {
  api?: Gw2ApiClient;
}

export interface EncodeOptions {
  api?: Gw2ApiClient;
}

export interface TraitData {
  id: number;
  name?: string;
}

export interface SkillData {
  id: number;
  name?: string;
  flags?: string[];
}

export interface ProfessionDetails {
  id: string;
  code: number;
  name: string;
  paletteById: Map<number, { skillId: number; name?: string }>; // paletteId -> info
  paletteBySkillId: Map<number, number>;
}

export interface SpecializationData {
  id: number;
  name: string;
  profession: string;
  major_traits: number[];
}

export interface Gw2ApiClient {
  resolveProfession(profession: number | string): Promise<ProfessionSummary>;
  getProfessionDetails(id: string): Promise<ProfessionDetails>;
  resolveSpecialization(input: number | string): Promise<SpecializationData>;
  resolveTraitChoices(spec: SpecializationData, traits: [TraitSelectionInput?, TraitSelectionInput?, TraitSelectionInput?] | undefined): Promise<[number, number, number]>;
  resolveSkillPalette(
    professionId: string,
    value: SkillInput,
    environment: 'terrestrial' | 'aquatic'
  ): Promise<{ paletteId: number; skillId?: number; name?: string }>;
  resolvePet(value: number | string | null | undefined): Promise<{ id: number; name?: string }>;
  resolveLegend(value: number | string | null | undefined): Promise<DecodedLegend>;
  resolveWeapon(value: number | string): Promise<DecodedWeapon>;
  resolveOverrideSkill(value: number | string): Promise<{ id: number; name?: string }>;
  getSpecializationById(id: number): Promise<SpecializationData>;
  getTraitData(ids: number[]): Promise<Map<number, TraitData>>;
  getSkillData(ids: number[]): Promise<Map<number, SkillData>>;
  getPetById(id: number): Promise<{ id: number; name?: string }>;
}
