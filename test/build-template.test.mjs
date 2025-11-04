import assert from 'node:assert/strict';
import { encodeBuildTemplate } from '../dist/index.js';

const skillPalettes = new Map([
  [1001, { paletteId: 1001, skillId: 1001, name: 'Shelter' }],
  [1002, { paletteId: 1002, skillId: 1002, name: 'Receive the Light!' }],
  [1003, { paletteId: 1003, skillId: 1003, name: 'Stand Your Ground!' }],
  [1004, { paletteId: 1004, skillId: 1004, name: 'Hold the Line!' }],
  [1005, { paletteId: 1005, skillId: 1005, name: 'Retreat!' }],
  [1006, { paletteId: 1006, skillId: 1006, name: 'Feel My Wrath!' }],
  [2001, { paletteId: 2001, skillId: 2001, name: 'Litany of Wrath' }],
  [2002, { paletteId: 2002, skillId: 2002, name: 'Purification' }],
  [2003, { paletteId: 2003, skillId: 2003, name: 'Judge\'s Intervention' }],
  [2004, { paletteId: 2004, skillId: 2004, name: 'Smite Condition' }],
  [2005, { paletteId: 2005, skillId: 2005, name: 'Bane Signet' }],
  [2006, { paletteId: 2006, skillId: 2006, name: 'Signet of Courage' }]
]);

const mockApi = {
  async resolveProfession() {
    return { id: 'guardian', name: 'Guardian', code: 1 };
  },
  async getProfessionDetails() {
    return {
      id: 'guardian',
      name: 'Guardian',
      code: 1,
      paletteById: new Map(),
      paletteBySkillId: new Map()
    };
  },
  async resolveSpecialization(input) {
    const id = typeof input === 'number' ? input : Number.parseInt(String(input), 10);
    return {
      id,
      name: `Mock Specialization ${id}`,
      profession: 'Guardian',
      major_traits: [
        10001, 10002, 10003,
        10004, 10005, 10006,
        10007, 10008, 10009
      ]
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
    const entry = typeof value === 'number' ? skillPalettes.get(value) : undefined;
    if (!entry) {
      throw new Error(`Unknown skill ${value}`);
    }
    return entry;
  },
  async resolvePet(value) {
    return { id: typeof value === 'number' ? value : 0 };
  },
  async resolveLegend(value) {
    return { code: typeof value === 'number' ? value : 0 };
  },
  async resolveWeapon(value) {
    if (typeof value === 'number') {
      return { id: value };
    }
    const normalized = String(value).toLowerCase();
    if (normalized === 'greatsword') {
      return { id: 50, name: 'greatsword' };
    }
    if (normalized === 'scepter') {
      return { id: 86, name: 'scepter' };
    }
    throw new Error(`Unknown weapon ${value}`);
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
  profession: 'Guardian',
  specializations: [
    { id: 1, traits: [1, 2, 3] },
    { id: 2, traits: [3, 2, 1] },
    { id: 3, traits: [2, 2, 2] }
  ],
  skills: {
    terrestrial: {
      heal: 1001,
      utilities: [1003, 1004, 1005],
      elite: 1006
    },
    aquatic: {
      heal: 2001,
      utilities: [2003, 2004, 2005],
      elite: 2006
    }
  },
  weapons: ['greatsword', 'scepter']
};

const chatLink = await encodeBuildTemplate(buildInput, { api: mockApi });
console.log('Encoded chat link:', chatLink);

const expectedChatLink = '[&DQEBOQIbAyrpA9EH6wPTB+wD1AftA9UH7gPWBwAAAAAAAAAAAAAAAAAAAAACMgBWAAA=]';

assert.equal(chatLink, expectedChatLink);
console.log('Build template encoding test passed.');
