import assert from 'node:assert/strict';
import { decodeBuildTemplate, encodeBuildTemplate } from '../dist/index.js';

const SKILL_METADATA = new Map([
  [7552, { skillId: 76738, name: 'Mitotic State' }],
  [403, { skillId: 5927, name: 'Flamethrower' }],
  [134, { skillId: 5805, name: 'Grenade Kit' }],
  [7514, { skillId: 77209, name: 'Plasmatic State' }],
  [263, { skillId: 5812, name: 'Bomb Kit' }],
  [7547, { skillId: 76993, name: 'Flux State' }]
]);

const SKILL_NAMES = new Map([
  [76738, 'Mitotic State'],
  [5927, 'Flamethrower'],
  [5805, 'Grenade Kit'],
  [77209, 'Plasmatic State'],
  [5812, 'Bomb Kit'],
  [76993, 'Flux State']
]);

const SPECIALIZATIONS = new Map([
  [
    6,
    {
      id: 6,
      name: 'Mock Specialization 6',
      profession: 'Engineer',
      major_traits: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009]
    }
  ],
  [
    38,
    {
      id: 38,
      name: 'Mock Specialization 38',
      profession: 'Engineer',
      major_traits: [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009]
    }
  ],
  [
    75,
    {
      id: 75,
      name: 'Mock Specialization 75',
      profession: 'Engineer',
      major_traits: [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009]
    }
  ]
]);

const mockApi = {
  async resolveProfession(value) {
    if (typeof value === 'number') {
      if (value !== 3) {
        throw new Error(`Unknown profession code ${value}`);
      }
      return { id: 'engineer', name: 'Engineer', code: 3 };
    }
    if (String(value).toLowerCase() !== 'engineer') {
      throw new Error(`Unknown profession ${value}`);
    }
    return { id: 'engineer', name: 'Engineer', code: 3 };
  },
  async getProfessionDetails() {
    return {
      id: 'engineer',
      name: 'Engineer',
      code: 3,
      paletteById: SKILL_METADATA,
      paletteBySkillId: new Map(
        Array.from(SKILL_METADATA.entries(), ([paletteId, value]) => [value.skillId, paletteId])
      )
    };
  },
  async resolveSpecialization(input) {
    const key = typeof input === 'number' ? input : Number.parseInt(String(input), 10);
    const spec = SPECIALIZATIONS.get(key);
    if (!spec) {
      throw new Error(`Unknown specialization ${input}`);
    }
    return spec;
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
    if (typeof value !== 'number' || !SKILL_METADATA.has(value)) {
      throw new Error(`Unknown skill palette ${value}`);
    }
    const info = SKILL_METADATA.get(value);
    return { paletteId: value, skillId: info?.skillId, name: info?.name };
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
    const spec = SPECIALIZATIONS.get(id);
    if (!spec) {
      throw new Error(`Unknown specialization ${id}`);
    }
    return spec;
  },
  async getTraitData(ids) {
    return new Map(ids.map((id) => [id, { id, name: `Trait ${id}` }]));
  },
  async getSkillData(ids) {
    return new Map(ids.map((id) => [id, { id, name: SKILL_NAMES.get(id) ?? `Skill ${id}` }]));
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

const expectedChatLink = '[&DQMGOyYvSx2AHYAdkwGGAFodWh0HAQcBex17HQAAAAAAAAAAAAAAAAAAAAABCQEA]';

const chatLink = await encodeBuildTemplate(buildInput, { api: mockApi });
console.log('Encoded chat link:', chatLink);
assert.equal(chatLink, expectedChatLink);

const decoded = await decodeBuildTemplate(chatLink, { api: mockApi });
console.log('Decoded build template:', JSON.stringify(decoded, null, 2));

assert.deepEqual(decoded.profession, { id: 'engineer', name: 'Engineer', code: 3 });

const decodedTraitIds = decoded.specializations.map((spec) => spec.traits.map((trait) => trait.traitId));
assert.deepEqual(decodedTraitIds, [
  [1003, 1005, 1009],
  [2003, 2006, 2008],
  [3001, 3006, 3007]
]);

assert.equal(decoded.skills.terrestrial.heal.name, 'Mitotic State');
assert.equal(decoded.skills.terrestrial.elite.name, 'Flux State');
assert.deepEqual(decoded.skills.terrestrial.utilities.map((skill) => skill.name), [
  'Flamethrower',
  'Plasmatic State',
  'Bomb Kit'
]);

assert.equal(decoded.skills.aquatic.heal.name, 'Mitotic State');
assert.equal(decoded.skills.aquatic.elite.name, 'Flux State');
assert.deepEqual(decoded.skills.aquatic.utilities.map((skill) => skill.name), [
  'Grenade Kit',
  'Plasmatic State',
  'Bomb Kit'
]);

assert.deepEqual(decoded.skills.aquatic.utilities.map((skill) => skill.paletteId), [134, 7514, 263]);

assert.deepEqual(decoded.weapons, [{ id: 265, name: 'spear' }]);
assert.deepEqual(decoded.skillOverrides, []);

const truncatedChatLink =
  '[&DQMGOyYvSx2AHYAdkwGGAFodWh0HAQcBex17HQAAAAAAAAAAAAAAAAAAAAA=]';
const truncatedDecoded = await decodeBuildTemplate(truncatedChatLink, { api: mockApi });
assert.deepEqual(truncatedDecoded.profession, { id: 'engineer', name: 'Engineer', code: 3 });
assert.deepEqual(
  truncatedDecoded.specializations.map((spec) => spec.traits.map((trait) => trait.traitId)),
  [
    [1003, 1005, 1009],
    [2003, 2006, 2008],
    [3001, 3006, 3007]
  ]
);
assert.equal(truncatedDecoded.skills.terrestrial.heal.name, 'Mitotic State');
assert.equal(truncatedDecoded.skills.terrestrial.elite.name, 'Flux State');
assert.deepEqual(truncatedDecoded.skills.terrestrial.utilities.map((skill) => skill.name), [
  'Flamethrower',
  'Plasmatic State',
  'Bomb Kit'
]);
assert.deepEqual(truncatedDecoded.weapons, []);
assert.deepEqual(truncatedDecoded.skillOverrides, []);

console.log('Build template encoding and decoding test passed.');
