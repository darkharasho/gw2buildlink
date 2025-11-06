import {
  DEFAULT_USER_AGENT,
  GW2_API_BASE,
  REVENANT_LEGEND_ALIASES,
  REVENANT_LEGEND_CODE_TO_NAME,
  WEAPON_ID_TO_NAME,
  WEAPON_NAME_TO_ID
} from './constants.js';
import {
  DecodedLegend,
  DecodedWeapon,
  ProfessionDetails,
  ProfessionSummary,
  SkillData,
  SpecializationData,
  TraitData,
  TraitSelectionInput
} from './types.js';

interface ProfessionRaw {
  id: string;
  name: string;
  code: number;
  skills_by_palette: Array<[number, number]>;
}

interface SpecializationRaw extends SpecializationData {}

interface TraitRaw extends TraitData {
  id: number;
  name?: string;
}

interface SkillRaw extends SkillData {
  id: number;
  name?: string;
}

interface PetRaw {
  id: number;
  name: string;
}

const FETCH_HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function isSkillAllowedInEnvironment(
  skill: SkillData | undefined,
  environment: 'terrestrial' | 'aquatic'
): boolean {
  if (!skill) {
    return true;
  }
  const flags = skill.flags ?? [];
  if (environment === 'aquatic') {
    if (flags.includes('NoUnderwater')) {
      return false;
    }
  } else if (environment === 'terrestrial') {
    if (flags.includes('UnderwaterOnly')) {
      return false;
    }
  }
  return true;
}

export class DefaultGw2ApiClient {
  private professionSummariesPromise?: Promise<ProfessionSummary[]>;
  private professionByCode = new Map<number, ProfessionSummary>();
  private professionByName = new Map<string, ProfessionSummary>();
  private professionDetails = new Map<string, Promise<ProfessionDetails>>();
  private specializationCache = new Map<number, Promise<SpecializationRaw>>();
  private specializationByName = new Map<string, number>();
  private traitCache = new Map<number, Promise<TraitRaw>>();
  private skillCache = new Map<number, Promise<SkillRaw>>();
  private petCache = new Map<number, Promise<PetRaw>>();
  private petByName = new Map<string, number>();

  async resolveProfession(profession: number | string): Promise<ProfessionSummary> {
    const summaries = await this.getProfessionSummaries();
    if (typeof profession === 'number') {
      const found = this.professionByCode.get(profession);
      if (!found) {
        throw new Error(`Unknown profession code ${profession}`);
      }
      return found;
    }
    const key = normalize(profession);
    const byName = this.professionByName.get(key);
    if (!byName) {
      throw new Error(`Unknown profession name ${profession}`);
    }
    return byName;
  }

  async getProfessionDetails(id: string): Promise<ProfessionDetails> {
    const key = id.toLowerCase();
    if (!this.professionDetails.has(key)) {
      this.professionDetails.set(key, this.fetchProfessionDetails(id));
    }
    return this.professionDetails.get(key)!;
  }

  private async fetchProfessionDetails(id: string): Promise<ProfessionDetails> {
    const data = await fetchJson<ProfessionRaw[]>(`${GW2_API_BASE}/professions?ids=${encodeURIComponent(id)}&v=latest`);
    if (!data.length) {
      throw new Error(`Unknown profession ${id}`);
    }
    const raw = data[0];
    const paletteById = new Map<number, { skillId: number; name?: string }>();
    const paletteBySkillId = new Map<number, number>();
    const skillIds = raw.skills_by_palette.map(([, skillId]) => skillId);
    const skillData = await this.getSkillData(skillIds);
    for (const [paletteId, skillId] of raw.skills_by_palette) {
      const skillInfo = skillData.get(skillId);
      paletteById.set(paletteId, { skillId, name: skillInfo?.name });
      paletteBySkillId.set(skillId, paletteId);
    }
    return {
      id: raw.id,
      name: raw.name,
      code: raw.code,
      paletteById,
      paletteBySkillId
    };
  }

  async resolveSpecialization(input: number | string): Promise<SpecializationRaw> {
    if (typeof input === 'number') {
      return this.getSpecializationById(input);
    }
    const nameKey = normalize(input);
    if (!this.specializationByName.size) {
      await this.buildSpecializationNameIndex();
    }
    const specId = this.specializationByName.get(nameKey);
    if (specId == null) {
      throw new Error(`Unknown specialization ${input}`);
    }
    return this.getSpecializationById(specId);
  }

  async getSpecializationById(id: number): Promise<SpecializationRaw> {
    if (!this.specializationCache.has(id)) {
      this.specializationCache.set(id, fetchJson<SpecializationRaw>(`${GW2_API_BASE}/specializations/${id}?v=latest`));
    }
    return this.specializationCache.get(id)!;
  }

  private async buildSpecializationNameIndex(): Promise<void> {
    const specs = await fetchJson<SpecializationRaw[]>(`${GW2_API_BASE}/specializations?ids=all&v=latest`);
    for (const spec of specs) {
      this.specializationByName.set(normalize(spec.name), spec.id);
      this.specializationCache.set(spec.id, Promise.resolve(spec));
    }
  }

  async resolveTraitChoices(
    spec: SpecializationRaw,
    traits: [TraitSelectionInput?, TraitSelectionInput?, TraitSelectionInput?] | undefined
  ): Promise<[number, number, number]> {
    const choices: [number, number, number] = [0, 0, 0];
    if (!traits) {
      return choices;
    }
    const traitData = await this.getTraitData(spec.major_traits);
    for (let tier = 0; tier < 3; tier++) {
      const input = traits[tier];
      if (input == null) {
        continue;
      }
      if (typeof input === 'number') {
        if (input >= 0 && input <= 3) {
          choices[tier] = input;
          continue;
        }
        const index = spec.major_traits.indexOf(input);
        if (index === -1) {
          throw new Error(`Trait id ${input} is not part of specialization ${spec.name}`);
        }
        choices[tier] = (index % 3) + 1;
        continue;
      }
      const normalized = normalize(input);
      const match = spec.major_traits.find((traitId) => {
        const trait = traitData.get(traitId);
        return trait?.name && normalize(trait.name) === normalized;
      });
      if (match == null) {
        throw new Error(`Trait ${input} not found in specialization ${spec.name}`);
      }
      const index = spec.major_traits.indexOf(match);
      choices[tier] = (index % 3) + 1;
    }
    return choices;
  }

  async resolveSkillPalette(
    professionId: string,
    value: TraitSelectionInput,
    environment: 'terrestrial' | 'aquatic'
  ): Promise<{ paletteId: number; skillId?: number; name?: string }> {
    if (value == null) {
      return { paletteId: 0 };
    }
    const details = await this.getProfessionDetails(professionId);
    const validateSkill = async (
      paletteId: number,
      skillId?: number,
      name?: string
    ): Promise<{ paletteId: number; skillId?: number; name?: string }> => {
      if (!paletteId || !skillId) {
        return { paletteId, skillId, name };
      }
      const skillData = await this.getSkillData([skillId]);
      const skill = skillData.get(skillId);
      if (!isSkillAllowedInEnvironment(skill, environment)) {
        return { paletteId: 0 };
      }
      return { paletteId, skillId, name: name ?? skill?.name };
    };
    if (typeof value === 'number') {
      if (value === 0) {
        return { paletteId: 0 };
      }
      if (details.paletteById.has(value)) {
        const info = details.paletteById.get(value)!;
        return validateSkill(value, info.skillId, info.name);
      }
      if (details.paletteBySkillId.has(value)) {
        const paletteId = details.paletteBySkillId.get(value)!;
        const info = details.paletteById.get(paletteId);
        return validateSkill(paletteId, value, info?.name);
      }
      const skillData = await this.getSkillData([value]);
      const skill = skillData.get(value);
      if (!skill) {
        throw new Error(`Unknown skill id ${value}`);
      }
      const paletteId = details.paletteBySkillId.get(value);
      if (!paletteId) {
        throw new Error(`Skill ${value} is not available for profession ${professionId}`);
      }
      const info = details.paletteById.get(paletteId);
      return validateSkill(paletteId, value, info?.name ?? skill.name);
    }
    const normalized = normalize(value);
    for (const [paletteId, info] of details.paletteById.entries()) {
      if (info.name && normalize(info.name) === normalized) {
        return validateSkill(paletteId, info.skillId, info.name);
      }
    }
    const skill = await this.findSkillByName(normalized);
    if (!skill) {
      throw new Error(`Unable to resolve skill ${value}`);
    }
    const paletteId = details.paletteBySkillId.get(skill.id);
    if (!paletteId) {
      throw new Error(`Skill ${skill.name ?? value} is not available for profession ${professionId}`);
    }
    const info = details.paletteById.get(paletteId);
    return validateSkill(paletteId, skill.id, info?.name ?? skill.name);
  }

  private async findSkillByName(normalizedName: string): Promise<SkillRaw | undefined> {
    for (const skillPromise of this.skillCache.values()) {
      const skill = await skillPromise;
      if (skill.name && normalize(skill.name) === normalizedName) {
        return skill;
      }
    }
    const ids = await fetchJson<number[]>(`${GW2_API_BASE}/skills?search=${encodeURIComponent(normalizedName)}&v=latest`);
    if (!ids.length) {
      return undefined;
    }
    const skills = await this.getSkillData(ids);
    const matches = Array.from(skills.values()).filter((skill) => skill.name && normalize(skill.name) === normalizedName);
    if (matches.length === 1) {
      return matches[0];
    }
    if (matches.length > 1) {
      throw new Error(`Skill name ${normalizedName} is ambiguous`);
    }
    return undefined;
  }

  async resolvePet(value: number | string | null | undefined): Promise<{ id: number; name?: string }> {
    if (value == null) {
      return { id: 0 };
    }
    if (typeof value === 'number') {
      const pet = await this.getPetById(value);
      if (!pet) {
        throw new Error(`Unknown pet id ${value}`);
      }
      return pet;
    }
    if (!this.petByName.size) {
      await this.buildPetIndex();
    }
    const key = normalize(value);
    const id = this.petByName.get(key);
    if (id == null) {
      throw new Error(`Unknown pet ${value}`);
    }
    return this.getPetById(id);
  }

  async getPetById(id: number): Promise<{ id: number; name?: string }> {
    if (!this.petCache.has(id)) {
      this.petCache.set(id, fetchJson<PetRaw>(`${GW2_API_BASE}/pets/${id}?v=latest`));
    }
    const pet = await this.petCache.get(id)!;
    return { id: pet.id, name: pet.name };
  }

  private async buildPetIndex(): Promise<void> {
    const pets = await fetchJson<PetRaw[]>(`${GW2_API_BASE}/pets?ids=all&v=latest`);
    for (const pet of pets) {
      this.petByName.set(normalize(pet.name), pet.id);
      this.petCache.set(pet.id, Promise.resolve(pet));
    }
  }

  async resolveLegend(value: number | string | null | undefined): Promise<DecodedLegend> {
    if (value == null) {
      return { code: 0, name: undefined };
    }
    if (typeof value === 'number') {
      const name = REVENANT_LEGEND_CODE_TO_NAME[value];
      if (!name) {
        throw new Error(`Unknown legend code ${value}`);
      }
      return { code: value, name };
    }
    const key = normalize(value);
    const code = REVENANT_LEGEND_ALIASES[key];
    if (!code) {
      throw new Error(`Unknown legend ${value}`);
    }
    return { code, name: REVENANT_LEGEND_CODE_TO_NAME[code] };
  }

  async resolveWeapon(value: number | string): Promise<DecodedWeapon> {
    if (typeof value === 'number') {
      const name = WEAPON_ID_TO_NAME[value];
      if (!name) {
        throw new Error(`Unknown weapon id ${value}`);
      }
      return { id: value, name };
    }
    const key = normalize(value);
    const id = WEAPON_NAME_TO_ID[key];
    if (!id) {
      throw new Error(`Unknown weapon ${value}`);
    }
    return { id, name: key };
  }

  async resolveOverrideSkill(value: number | string): Promise<{ id: number; name?: string }> {
    if (typeof value === 'number') {
      const skill = await this.getSkillData([value]);
      const info = skill.get(value);
      if (!info) {
        throw new Error(`Unknown skill id ${value}`);
      }
      return { id: value, name: info.name };
    }
    const normalized = normalize(value);
    const skill = await this.findSkillByName(normalized);
    if (!skill) {
      throw new Error(`Unknown skill ${value}`);
    }
    return { id: skill.id, name: skill.name };
  }

  async getSpecializationSummaries(ids: number[]): Promise<Map<number, SpecializationRaw>> {
    const result = new Map<number, SpecializationRaw>();
    const missing = ids.filter((id) => !this.specializationCache.has(id));
    if (missing.length) {
      const chunks = chunkArray(missing, 150);
      for (const chunk of chunks) {
        const specs = await fetchJson<SpecializationRaw[]>(
          `${GW2_API_BASE}/specializations?ids=${chunk.join(',')}&v=latest`
        );
        for (const spec of specs) {
          this.specializationCache.set(spec.id, Promise.resolve(spec));
        }
      }
    }
    for (const id of ids) {
      const spec = await this.specializationCache.get(id)!;
      result.set(id, spec);
    }
    return result;
  }

  async getTraitData(ids: number[]): Promise<Map<number, TraitData>> {
    const result = new Map<number, TraitData>();
    const missing = ids.filter((id) => !this.traitCache.has(id));
    if (missing.length) {
      const chunks = chunkArray(missing, 150);
      for (const chunk of chunks) {
        const traits = await fetchJson<TraitRaw[]>(`${GW2_API_BASE}/traits?ids=${chunk.join(',')}&v=latest`);
        for (const trait of traits) {
          this.traitCache.set(trait.id, Promise.resolve(trait));
        }
      }
    }
    for (const id of ids) {
      const traitPromise = this.traitCache.get(id);
      if (traitPromise) {
        const trait = await traitPromise;
        result.set(id, { id: trait.id, name: trait.name });
      }
    }
    return result;
  }

  async getSkillData(ids: number[]): Promise<Map<number, SkillData>> {
    const result = new Map<number, SkillData>();
    const missing = ids.filter((id) => !this.skillCache.has(id));
    if (missing.length) {
      const chunks = chunkArray(missing, 150);
      for (const chunk of chunks) {
        const skills = await fetchJson<SkillRaw[]>(`${GW2_API_BASE}/skills?ids=${chunk.join(',')}&v=latest`);
        for (const skill of skills) {
          this.skillCache.set(skill.id, Promise.resolve(skill));
        }
      }
    }
    for (const id of ids) {
      const skillPromise = this.skillCache.get(id);
      if (skillPromise) {
        const skill = await skillPromise;
        result.set(id, { id: skill.id, name: skill.name, flags: skill.flags });
      }
    }
    return result;
  }

  private async getProfessionSummaries(): Promise<ProfessionSummary[]> {
    if (!this.professionSummariesPromise) {
      this.professionSummariesPromise = (async () => {
        const data = await fetchJson<ProfessionRaw[]>(`${GW2_API_BASE}/professions?ids=all&v=latest`);
        const summaries = data.map((prof) => ({ id: prof.id, name: prof.name, code: prof.code }));
        for (const summary of summaries) {
          this.professionByCode.set(summary.code, summary);
          this.professionByName.set(normalize(summary.id), summary);
          this.professionByName.set(normalize(summary.name), summary);
        }
        return summaries;
      })();
    }
    return this.professionSummariesPromise;
  }
}

export type { DefaultGw2ApiClient as Gw2ApiClientImpl };
