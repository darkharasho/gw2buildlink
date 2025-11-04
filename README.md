# gw2buildlink

A small toolkit for encoding and decoding [Guild Wars 2 build template chat links](https://wiki.guildwars2.com/wiki/Chat_link_format).
The library can turn a human readable build description into a chat link and resolve a chat link back into structured data.
It relies on the public [Guild Wars 2 API](https://wiki.guildwars2.com/wiki/API:Main) to translate names into IDs and vice versa.

## Installation

```bash
npm install gw2buildlink
```

## Usage

```ts
import { encodeBuildTemplate, decodeBuildTemplate } from 'gw2buildlink';

const chatCode = await encodeBuildTemplate({
  profession: 'Necromancer',
  specializations: [
    { id: 'Curses', traits: ['Barbed Precision', 'Chilling Darkness', 'Terror'] },
    { id: 'Soul Reaping', traits: [1, 3, 2] },
    { id: 'Scourge', traits: [2093, 'Demonic Lore', 'Sandstorm Shroud'] }
  ],
  skills: {
    terrestrial: {
      heal: 'Summon Blood Fiend',
      utilities: ['Epidemic', 'Corrosive Poison Cloud', 'Summon Flesh Golem'],
      elite: 'Plaguelands'
    }
  }
});

const decoded = await decodeBuildTemplate(chatCode);
console.log(decoded.profession.name);
```

The encoder accepts either API IDs or human readable names for professions, specializations, traits, skills, weapons, pets, legends and override skills.
When decoding the library resolves IDs back to their names whenever the Guild Wars 2 API provides them.

### Using raw API IDs

If you already know the numeric IDs exposed by the official Guild Wars 2 API you can pass them directly to the encoder.
This is useful when consuming data that has already been normalised to API identifiers or when you want to avoid additional name resolution work.

```ts
const chatCode = await encodeBuildTemplate({
  profession: 1, // Guardian
  specializations: [
    { id: 17, traits: [564, 567, 569] },
    { id: 27, traits: [728, 735, 739] },
    { id: 62, traits: [2056, 2059, 2061] }
  ],
  skills: {
    terrestrial: {
      heal: 9107,
      utilities: [9087, 9084, 9086],
      elite: 9085
    }
  }
});
```

You can discover these IDs through the [official API documentation](https://wiki.guildwars2.com/wiki/API:Main) and the associated `/v2` endpoints.
Some commonly used ones are:

* `/v2/professions` for profession IDs
* `/v2/specializations` for specialization IDs
* `/v2/traits` for trait IDs
* `/v2/skills` for skill, legend, and pet IDs

Each endpoint supports filtering via `?ids=all` or by name-specific ID queries so you can look up individual values programmatically.
See the [chat link format reference](https://wiki.guildwars2.com/wiki/Chat_link_format) for how these IDs map into the encoded build template payload.

## Development

```bash
npm install
npm run build
```

## Local testing

You can try the package in a local Node.js REPL before publishing it to npm.

```bash
# build the TypeScript sources
npm run build

# create an installable tarball and install it into a scratch project
npm pack
mkdir -p /tmp/gw2buildlink-playground
cd /tmp/gw2buildlink-playground
npm init -y
npm install /workspace/gw2buildlink/gw2buildlink-*.tgz

# launch a Node.js console with top-level await enabled
node --experimental-repl-await
```

Inside the REPL you can import and exercise the library:

```js
const { encodeBuildTemplate, decodeBuildTemplate } = await import('gw2buildlink');
const chat = await encodeBuildTemplate({
  profession: 'Guardian',
  specializations: [
    { id: 'Zeal', traits: ['Fiery Wrath', 'Zealous Scepter', 'Symbolic Avenger'] },
    { id: 'Radiance', traits: ['Righteous Instincts', 'Radiant Fire', 'Retribution'] },
    { id: 'Dragonhunter', traits: ['Piercing Light', 'Bulwark', 'Big Game Hunter'] }
  ]
});
await decodeBuildTemplate(chat);
```

When you're finished testing you can remove the temporary directory and tarball:

```bash
rm -rf /tmp/gw2buildlink-playground
rm /workspace/gw2buildlink/gw2buildlink-*.tgz
```
