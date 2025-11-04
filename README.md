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

## Development

```bash
npm install
npm run build
```
