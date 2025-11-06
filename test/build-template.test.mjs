import assert from 'node:assert/strict';
import { decodeBuildTemplate, encodeBuildTemplate } from '../dist/index.js';

const PROFESSION_SKILL_METADATA = new Map([
  [
    'engineer',
    new Map([
      [7552, { skillId: 76738, name: 'Mitotic State', flags: [] }],
      [403, { skillId: 5927, name: 'Flamethrower', flags: [] }],
      [134, { skillId: 5805, name: 'Grenade Kit', flags: [] }],
      [7514, { skillId: 77209, name: 'Plasmatic State', flags: [] }],
      [263, { skillId: 5812, name: 'Bomb Kit', flags: [] }],
      [7547, { skillId: 76993, name: 'Flux State', flags: [] }],
      [9100, { skillId: 81000, name: 'Terrestrial Signet', flags: ['NoUnderwater'] }]
    ])
  ],
  [
    'necromancer',
    new Map([
      [3880, { skillId: 10612, name: 'Signet of Vampirism', flags: ['NoUnderwater'] }],
      [371, { skillId: 10547, name: 'Well of Corruption', flags: ['NoUnderwater'] }],
      [374, { skillId: 10548, name: 'Signet of the Locust', flags: ['NoUnderwater'] }],
      [304, { skillId: 10557, name: 'Corrupt Boon', flags: ['NoUnderwater'] }],
      [378, { skillId: 10581, name: 'Lich Form', flags: ['NoUnderwater'] }]
    ])
  ]
]);

const ALL_SKILL_METADATA = new Map(
  Array.from(PROFESSION_SKILL_METADATA.values()).flatMap((metadata) => Array.from(metadata.entries()))
);

const SKILL_INFO_BY_ID = new Map(
  Array.from(ALL_SKILL_METADATA.values()).map((info) => [info.skillId, info])
);

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
  ],
  [
    53,
    {
      id: 53,
      name: 'Mock Specialization 53',
      profession: 'Necromancer',
      major_traits: [4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009]
    }
  ],
  [
    39,
    {
      id: 39,
      name: 'Mock Specialization 39',
      profession: 'Necromancer',
      major_traits: [5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009]
    }
  ],
  [
    50,
    {
      id: 50,
      name: 'Mock Specialization 50',
      profession: 'Necromancer',
      major_traits: [6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009]
    }
  ]
]);

const PROFESSION_SUMMARIES = new Map([
  ['engineer', { id: 'engineer', name: 'Engineer', code: 3 }],
  ['necromancer', { id: 'necromancer', name: 'Necromancer', code: 8 }]
]);

const PROFESSION_BY_CODE = new Map([
  [3, 'engineer'],
  [8, 'necromancer']
]);

const PROFESSION_ALIASES = new Map([
  ['engineer', 'engineer'],
  ['necromancer', 'necromancer']
]);

const mockApi = {
  async resolveProfession(value) {
    if (typeof value === 'number') {
      const key = PROFESSION_BY_CODE.get(value);
      if (!key) {
        throw new Error(`Unknown profession code ${value}`);
      }
      const summary = PROFESSION_SUMMARIES.get(key);
      if (!summary) {
        throw new Error(`Unknown profession code ${value}`);
      }
      return { ...summary };
    }
    const key = PROFESSION_ALIASES.get(String(value).toLowerCase());
    if (!key) {
      throw new Error(`Unknown profession ${value}`);
    }
    const summary = PROFESSION_SUMMARIES.get(key);
    if (!summary) {
      throw new Error(`Unknown profession ${value}`);
    }
    return { ...summary };
  },
  async getProfessionDetails(input) {
    let key;
    if (typeof input === 'number') {
      key = PROFESSION_BY_CODE.get(input);
    } else if (typeof input === 'string') {
      key = PROFESSION_ALIASES.get(input.toLowerCase()) ?? input.toLowerCase();
    }
    if (!key) {
      throw new Error(`Unknown profession ${input}`);
    }
    const summary = PROFESSION_SUMMARIES.get(key);
    if (!summary) {
      throw new Error(`Unknown profession ${input}`);
    }
    const paletteById = PROFESSION_SKILL_METADATA.get(key) ?? new Map();
    return {
      ...summary,
      paletteById,
      paletteBySkillId: new Map(
        Array.from(paletteById.entries(), ([paletteId, value]) => [value.skillId, paletteId])
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
  async resolveSkillPalette(professionId, value, environment) {
    if (value == null) {
      return { paletteId: 0 };
    }
    const key = typeof professionId === 'string' ? professionId.toLowerCase() : undefined;
    const paletteById = (key && PROFESSION_SKILL_METADATA.get(key)) ?? undefined;
    if (!paletteById) {
      throw new Error(`Unknown profession ${professionId}`);
    }
    const paletteId =
      typeof value === 'number' ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(paletteId) || !paletteById.has(paletteId)) {
      throw new Error(`Unknown skill palette ${value}`);
    }
    const info = paletteById.get(paletteId);
    const flags = info?.flags ?? [];
    if (environment === 'aquatic' && flags.includes('NoUnderwater')) {
      return { paletteId: 0 };
    }
    if (environment === 'terrestrial' && flags.includes('UnderwaterOnly')) {
      return { paletteId: 0 };
    }
    return { paletteId, skillId: info?.skillId, name: info?.name };
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
    return new Map(
      ids.map((id) => {
        const metadata = SKILL_INFO_BY_ID.get(id);
        return [id, { id, name: metadata?.name ?? `Skill ${id}`, flags: metadata?.flags ?? [] }];
      })
    );
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

const expectedChatLink = '[&DQMGOyYvSx2AHYAdkwGGAFodWh0HAQcBex17HQAAAAAAAAAAAAAAAAAAAAABCQE=]';

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

const necromancerBuildInput = {
  profession: 'Necromancer',
  specializations: [
    { id: 53, traits: [1, 3, 3] },
    { id: 39, traits: [3, 2, 3] },
    { id: 50, traits: [3, 2, 1] }
  ],
  skills: {
    terrestrial: {
      heal: 3880,
      utilities: [371, 374, 304],
      elite: 378
    }
  }
};

const expectedNecromancerChatLink =
  '[&DQg1PSc7MhsoDwAAcwEAAHYBAAAwAQAAegEAAAAAAAAAAAAAAAAAAAAAAAA=]';

const necromancerChatLink = await encodeBuildTemplate(necromancerBuildInput, { api: mockApi });
console.log('Necromancer encoded chat link:', necromancerChatLink);
assert.equal(necromancerChatLink, expectedNecromancerChatLink);

const necromancerDecoded = await decodeBuildTemplate(necromancerChatLink, { api: mockApi });
console.log('Necromancer decoded build template:', JSON.stringify(necromancerDecoded, null, 2));

assert.deepEqual(necromancerDecoded.profession, {
  id: 'necromancer',
  name: 'Necromancer',
  code: 8
});

assert.deepEqual(necromancerDecoded.specializations.map((spec) => spec.traits.map((trait) => trait.traitId)), [
  [4001, 4006, 4009],
  [5003, 5005, 5009],
  [6003, 6005, 6007]
]);

assert.equal(necromancerDecoded.skills.terrestrial.heal.name, 'Signet of Vampirism');
assert.deepEqual(necromancerDecoded.skills.terrestrial.utilities.map((skill) => skill.name), [
  'Well of Corruption',
  'Signet of the Locust',
  'Corrupt Boon'
]);
assert.equal(necromancerDecoded.skills.terrestrial.elite.name, 'Lich Form');

assert.equal(necromancerDecoded.skills.aquatic.heal.paletteId, 0);
assert.deepEqual(necromancerDecoded.skills.aquatic.utilities.map((skill) => skill.paletteId), [0, 0, 0]);
assert.equal(necromancerDecoded.skills.aquatic.elite.paletteId, 0);

const terrestrialOnlyInput = {
  ...buildInput,
  skills: {
    terrestrial: {
      heal: 7552,
      utilities: [9100, 7514, 263],
      elite: 7547
    },
    aquatic: {
      heal: 7552,
      utilities: [9100, 7514, 263],
      elite: 7547
    }
  }
};

const terrestrialOnlyLink = await encodeBuildTemplate(terrestrialOnlyInput, { api: mockApi });
const terrestrialOnlyDecoded = await decodeBuildTemplate(terrestrialOnlyLink, { api: mockApi });

assert.equal(terrestrialOnlyDecoded.skills.terrestrial.utilities[0].paletteId, 9100);
assert.equal(terrestrialOnlyDecoded.skills.terrestrial.utilities[0].name, 'Terrestrial Signet');
assert.equal(terrestrialOnlyDecoded.skills.aquatic.utilities[0].paletteId, 0);
assert.equal(terrestrialOnlyDecoded.skills.aquatic.utilities[0].name, undefined);

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
