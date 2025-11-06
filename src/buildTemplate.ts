import { encodeChatCode, decodeChatCode, ensureBuildTemplate } from './chatLink.js';
import {
  CHAT_LINK_BUILD_TEMPLATE_TYPE,
  REVENANT_LEGEND_CODE_TO_NAME,
  SKILL_SLOT_ORDER,
  WEAPON_ID_TO_NAME
} from './constants.js';
import { DefaultGw2ApiClient } from './gw2ApiClient.js';
import type {
  BuildTemplateInput,
  DecodeOptions,
  DecodedBuildTemplate,
  DecodedSkill,
  DecodedSpecialization,
  EncodeOptions,
  Gw2ApiClient,
  ProfessionSummary,
  SkillData,
  SkillInput,
  SpecializationData,
  TraitChoice
} from './types.js';

const TIER_NAMES: TraitChoice['tier'][] = ['adept', 'master', 'grandmaster'];

const MINIMUM_BUILD_TEMPLATE_LENGTH =
  1 + // type
  1 + // profession code
  3 * 2 + // three specializations (id + trait byte)
  SKILL_SLOT_ORDER.length * 2 + // ten skill palette entries
  16; // profession specific data

function encodeTraitByte(choices: [number, number, number]): number {
  const [adept, master, grandmaster] = choices.map((value) => Math.max(0, Math.min(3, value))) as [number, number, number];
  return adept | (master << 2) | (grandmaster << 4);
}

function decodeTraitByte(value: number): [number, number, number] {
  return [value & 0b11, (value >> 2) & 0b11, (value >> 4) & 0b11];
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function writeUint16(value: number, target: number[]): void {
  target.push(value & 0xff, (value >> 8) & 0xff);
}

function writeUint32(value: number, target: number[]): void {
  target.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

function getSkillInputForSlot(skills: BuildTemplateInput['skills'], index: number): SkillInput {
  const descriptor = SKILL_SLOT_ORDER[index];
  const set = descriptor.environment === 'terrestrial' ? skills?.terrestrial : skills?.aquatic;
  if (!set) {
    return undefined;
  }
  if (descriptor.slot === 'heal') {
    return set.heal;
  }
  if (descriptor.slot === 'elite') {
    return set.elite;
  }
  const utilities = set.utilities ?? [];
  const slotIndex = 'index' in descriptor ? descriptor.index ?? 0 : 0;
  return utilities[slotIndex];
}

async function buildDecodedSpecialization(
  api: Gw2ApiClient,
  spec: SpecializationData,
  choices: [number, number, number]
): Promise<DecodedSpecialization> {
  const traitIds = spec.major_traits;
  const traitData = await api.getTraitData(traitIds);
  const traits: TraitChoice[] = choices.map((choice, tierIndex) => {
    if (!choice) {
      return { tier: TIER_NAMES[tierIndex], choice: 0 };
    }
    const traitId = traitIds[tierIndex * 3 + (choice - 1)];
    const data = traitData.get(traitId);
    return {
      tier: TIER_NAMES[tierIndex],
      choice,
      traitId,
      name: data?.name
    };
  }) as TraitChoice[];
  return {
    id: spec.id,
    name: spec.name,
    traits
  };
}

async function resolveApi(options?: { api?: Gw2ApiClient }): Promise<Gw2ApiClient> {
  if (options?.api) {
    return options.api;
  }
  return new DefaultGw2ApiClient();
}

export async function encodeBuildTemplate(input: BuildTemplateInput, options?: EncodeOptions): Promise<string> {
  const api = await resolveApi(options);
  const bytes: number[] = [CHAT_LINK_BUILD_TEMPLATE_TYPE];

  const profession = await api.resolveProfession(input.profession);
  bytes.push(profession.code);

  const specializations = input.specializations ?? [];
  if (specializations.length !== 3) {
    throw new Error('Build templates must define exactly three specializations.');
  }

  for (let i = 0; i < 3; i++) {
    const specInput = specializations[i];
    if (!specInput || specInput.id == null) {
      bytes.push(0, 0);
      continue;
    }
    const spec = await api.resolveSpecialization(specInput.id);
    const traitChoices = await api.resolveTraitChoices(spec, specInput.traits);
    bytes.push(spec.id, encodeTraitByte(traitChoices));
  }

  const professionDetails = await api.getProfessionDetails(profession.id);
  for (let i = 0; i < SKILL_SLOT_ORDER.length; i++) {
    const descriptor = SKILL_SLOT_ORDER[i];
    const resolved = await api.resolveSkillPalette(
      professionDetails.id,
      getSkillInputForSlot(input.skills, i),
      descriptor.environment
    );
    writeUint16(resolved.paletteId, bytes);
  }

  const professionSpecific: number[] = new Array(16).fill(0);
  if (profession.id.toLowerCase() === 'ranger') {
    const pets = input.rangerPets ?? [];
    for (let i = 0; i < 4; i++) {
      const petInput = pets[i];
      const pet = await api.resolvePet(petInput ?? null);
      professionSpecific[i] = pet.id;
    }
  } else if (profession.id.toLowerCase() === 'revenant') {
    const legends = input.revenantLegends ?? [];
    for (let i = 0; i < 4; i++) {
      const legendInput = legends[i];
      const legend = await api.resolveLegend(legendInput ?? null);
      professionSpecific[i] = legend.code;
    }
    const inactiveSkills = input.revenantInactiveSkills ?? [];
    for (let i = 0; i < 6; i++) {
      const selection = await api.resolveSkillPalette(
        professionDetails.id,
        inactiveSkills[i],
        'terrestrial'
      );
      professionSpecific[4 + i * 2] = selection.paletteId & 0xff;
      professionSpecific[4 + i * 2 + 1] = (selection.paletteId >> 8) & 0xff;
    }
  }

  bytes.push(...professionSpecific);

  const weapons = input.weapons ?? [];
  if (weapons.length > 8) {
    throw new Error('A maximum of eight weapons can be stored in a build template.');
  }

  const overrides = input.skillOverrides ?? [];
  if (overrides.length > 255) {
    throw new Error('Too many skill overrides.');
  }

  if (weapons.length > 0 || overrides.length > 0) {
    bytes.push(weapons.length);
    for (const weaponInput of weapons) {
      const weapon = await api.resolveWeapon(weaponInput);
      writeUint16(weapon.id, bytes);
    }
  }

  if (overrides.length > 0) {
    bytes.push(overrides.length);
    for (const overrideInput of overrides) {
      const skill = await api.resolveOverrideSkill(overrideInput);
      writeUint32(skill.id, bytes);
    }
  }

  return encodeChatCode(Uint8Array.from(bytes));
}

export async function decodeBuildTemplate(link: string, options?: DecodeOptions): Promise<DecodedBuildTemplate> {
  const api = await resolveApi(options);
  const bytes = decodeChatCode(link);
  ensureBuildTemplate(bytes);

  if (bytes.length < MINIMUM_BUILD_TEMPLATE_LENGTH) {
    throw new Error('Chat link is too short to be a valid build template.');
  }

  let offset = 1;
  const professionCode = bytes[offset++];
  const profession: ProfessionSummary = await api.resolveProfession(professionCode);
  const professionDetails = await api.getProfessionDetails(profession.id);

  const specializations: Array<{ id: number; choices: [number, number, number] }> = [];
  for (let i = 0; i < 3; i++) {
    const specId = bytes[offset++];
    const traitByte = bytes[offset++];
    specializations.push({ id: specId, choices: decodeTraitByte(traitByte) });
  }

  const skillPalettes: number[] = [];
  for (let i = 0; i < SKILL_SLOT_ORDER.length; i++) {
    const palette = readUint16(bytes, offset);
    offset += 2;
    skillPalettes.push(palette);
  }

  const professionSpecific = bytes.slice(offset, offset + 16);
  offset += 16;

  let weaponCount = 0;
  const weapons: number[] = [];
  if (offset < bytes.length) {
    weaponCount = bytes[offset++];
    const requiredBytes = weaponCount * 2;
    if (offset + requiredBytes > bytes.length) {
      throw new Error('Chat link ended unexpectedly while reading weapon data.');
    }
    for (let i = 0; i < weaponCount; i++) {
      weapons.push(readUint16(bytes, offset));
      offset += 2;
    }
  }

  let overrideCount = 0;
  const overrides: number[] = [];
  if (offset < bytes.length) {
    overrideCount = bytes[offset++];
    const requiredBytes = overrideCount * 4;
    if (offset + requiredBytes > bytes.length) {
      throw new Error('Chat link ended unexpectedly while reading skill override data.');
    }
    for (let i = 0; i < overrideCount; i++) {
      overrides.push(readUint32(bytes, offset));
      offset += 4;
    }
  }

  if (offset !== bytes.length) {
    throw new Error('Chat link contains unexpected extra data.');
  }

  const decodedSpecializations: DecodedSpecialization[] = [];
  for (const entry of specializations) {
    if (entry.id === 0) {
      decodedSpecializations.push({ id: 0, traits: [] });
      continue;
    }
    const spec = await api.getSpecializationById(entry.id);
    decodedSpecializations.push(await buildDecodedSpecialization(api, spec, entry.choices));
  }

  const decodedSkills: DecodedSkill[] = [];
  const decodedSkillIds = new Set<number>();
  for (let i = 0; i < SKILL_SLOT_ORDER.length; i++) {
    const descriptor = SKILL_SLOT_ORDER[i];
    const slotIndex = 'index' in descriptor ? descriptor.index : undefined;
    const paletteId = skillPalettes[i];
    const info = paletteId ? professionDetails.paletteById.get(paletteId) : undefined;
    if (info?.skillId) {
      decodedSkillIds.add(info.skillId);
    }
    decodedSkills.push({
      environment: descriptor.environment,
      slot: descriptor.slot,
      slotIndex,
      paletteId,
      skillId: info?.skillId,
      name: info?.name
    });
  }

  const splitSkills = (environment: 'terrestrial' | 'aquatic'): {
    heal: DecodedSkill;
    utilities: DecodedSkill[];
    elite: DecodedSkill;
  } => {
    const heal = decodedSkills.find((skill) => skill.environment === environment && skill.slot === 'heal');
    const elite = decodedSkills.find((skill) => skill.environment === environment && skill.slot === 'elite');
    const utilities = decodedSkills
      .filter((skill) => skill.environment === environment && skill.slot === 'utility')
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
    if (!heal || !elite || utilities.length !== 3) {
      throw new Error('Failed to parse skill data from build template.');
    }
    return { heal, elite, utilities };
  };

  let rangerPets: Array<{ id: number; name?: string }> | undefined;
  if (profession.id.toLowerCase() === 'ranger') {
    rangerPets = [];
    for (let i = 0; i < 4; i++) {
      const petId = professionSpecific[i];
      if (petId) {
        rangerPets.push(await api.getPetById(petId));
      } else {
        rangerPets.push({ id: 0 });
      }
    }
  }

  let revenantLegends: Array<{ code: number; name?: string }> | undefined;
  let revenantInactive: DecodedSkill[] | undefined;
  if (profession.id.toLowerCase() === 'revenant') {
    revenantLegends = [];
    for (let i = 0; i < 4; i++) {
      const code = professionSpecific[i];
      if (!code) {
        revenantLegends.push({ code: 0 });
        continue;
      }
      revenantLegends.push({ code, name: REVENANT_LEGEND_CODE_TO_NAME[code] });
    }
    revenantInactive = [];
    for (let i = 0; i < 6; i++) {
      const palette = professionSpecific[4 + i * 2] | (professionSpecific[5 + i * 2] << 8);
      if (!palette) {
        revenantInactive.push({
          environment: 'terrestrial',
          slot: 'utility',
          slotIndex: i,
          paletteId: 0
        });
        continue;
      }
      const info = professionDetails.paletteById.get(palette);
      if (info?.skillId) {
        decodedSkillIds.add(info.skillId);
      }
      revenantInactive.push({
        environment: 'terrestrial',
        slot: 'utility',
        slotIndex: i,
        paletteId: palette,
        skillId: info?.skillId,
        name: info?.name
      });
    }
  }

  let decodedSkillMetadata: Map<number, SkillData> | undefined;
  const getDecodedSkillMetadata = async (): Promise<Map<number, SkillData>> => {
    if (!decodedSkillMetadata) {
      decodedSkillMetadata = decodedSkillIds.size
        ? await api.getSkillData(Array.from(decodedSkillIds))
        : new Map();
    }
    return decodedSkillMetadata;
  };

  const applySkillNames = async (skills: DecodedSkill[]): Promise<void> => {
    if (!decodedSkillIds.size) {
      return;
    }
    const metadata = await getDecodedSkillMetadata();
    for (const skill of skills) {
      if (skill.skillId) {
        const info = metadata.get(skill.skillId);
        if (info?.name) {
          skill.name = info.name;
        }
      }
    }
  };

  await applySkillNames(decodedSkills);
  if (revenantInactive) {
    await applySkillNames(revenantInactive);
  }

  const weaponOutputs = weapons.map((id) => ({ id, name: WEAPON_ID_TO_NAME[id] }));

  const overrideSkillData = await api.getSkillData(overrides);
  const overrideOutputs = overrides.map((id) => ({ id, name: overrideSkillData.get(id)?.name }));

  return {
    profession,
    specializations: decodedSpecializations,
    skills: {
      terrestrial: splitSkills('terrestrial'),
      aquatic: splitSkills('aquatic')
    },
    rangerPets,
    revenantLegends,
    revenantInactiveSkills: revenantInactive,
    weapons: weaponOutputs,
    skillOverrides: overrideOutputs
  };
}
