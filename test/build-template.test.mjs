import assert from 'node:assert/strict';
import { encodeBuildTemplate } from '../dist/index.js';

const SKILL_PALETTES = new Set([7552, 403, 134, 7514, 263, 7547]);

const mockApi = {
  async resolveProfession() {
    return { id: 'engineer', name: 'Engineer', code: 3 };
  },
  async getProfessionDetails() {
    return {
      id: 'engineer',
      name: 'Engineer',
      code: 3,
      paletteById: new Map(),
      paletteBySkillId: new Map()
    };
  },
  async resolveSpecialization(input) {
    const id = typeof input === 'number' ? input : Number.parseInt(String(input), 10);
    return {
      id,
      name: `Mock Specialization ${id}`,
      profession: 'Engineer',
      major_traits: [0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
  },
  async resolveTraitChoices(_spec, traits) {
    return [
      Number(traits?.[0] ?? 0),
      Number(traits?.[1] ?? 0),
      Number(traits?.[2] ?? 0)
    ];
  },
  async resolveSkillPalette(_professionId, value) {
    if (value == null) {
      return { paletteId: 0 };
    }
    if (typeof value !== 'number' || !SKILL_PALETTES.has(value)) {
      throw new Error(`Unknown skill palette ${value}`);
    }
    return { paletteId: value };
  },
  async resolvePet(value) {
    return { id: typeof value === 'number' ? value : 0 };
  },
  async resolveLegend(value) {
    return { code: typeof value === 'number' ? value : 0 };
  },
  async resolveWeapon(value) {
    if (typeof value === 'number') {
      if (value !== 265) {
        throw new Error(`Unknown weapon id ${value}`);
      }
      return { id: value, name: 'spear' };
    }
    if (String(value).toLowerCase() !== 'spear') {
      throw new Error(`Unknown weapon ${value}`);
    }
    return { id: 265, name: 'spear' };
  },
  async resolveOverrideSkill(value) {
    return { id: typeof value === 'number' ? value : 0 };
  },
  async getSpecializationById(id) {
    return this.resolveSpecialization(id);
  },
  async getTraitData(ids) {
    return new Map(ids.map((id) => [id, { id, name: `Trait ${id}` }]));
  },
  async getSkillData(ids) {
    return new Map(ids.map((id) => [id, { id, name: `Skill ${id}` }]));
  },
  async getPetById(id) {
    return { id };
  }
};

const buildInput = {
  profession: 'Engineer',
  specializations: [
    { id: 6, traits: [3, 2, 3] },
    { id: 38, traits: [3, 3, 2] },
    { id: 75, traits: [1, 3, 1] }
  ],
  skills: {
    terrestrial: {
      heal: 7552,
      utilities: [403, 7514, 263],
      elite: 7547
    },
    aquatic: {
      heal: 7552,
      utilities: [134, 7514, 263],
      elite: 7547
    }
  },
  weapons: [265]
};

const chatLink = await encodeBuildTemplate(buildInput, { api: mockApi });
console.log('Encoded chat link:', chatLink);

const expectedChatLink = '[&DQMGOyYvSx2AHYAdkwGGAFodWh0HAQcBex17HQAAAAAAAAAAAAAAAAAAAAABCQEA]';

assert.equal(chatLink, expectedChatLink);
console.log('Build template encoding test passed.');
