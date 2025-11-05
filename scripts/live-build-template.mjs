#!/usr/bin/env node
import { decodeBuildTemplate, encodeBuildTemplate, DefaultGw2ApiClient } from '../dist/index.js';

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

async function main() {
  const api = new DefaultGw2ApiClient();

  console.log('Encoding build template using live Guild Wars 2 API data...');
  const chatLink = await encodeBuildTemplate(buildInput, { api });
  console.log('Encoded chat link:', chatLink);

  console.log('\nDecoding the encoded chat link...');
  const decoded = await decodeBuildTemplate(chatLink, { api });
  console.log(JSON.stringify(decoded, null, 2));

  console.log('\nDecoding the known good chat link...');
  const decodedKnown = await decodeBuildTemplate(expectedChatLink, { api });
  console.log(JSON.stringify(decodedKnown, null, 2));
}

main().catch((error) => {
  if (error?.cause?.code === 'ENETUNREACH') {
    console.error('Failed to reach the Guild Wars 2 API. Ensure you have internet access and try again.');
  } else {
    console.error(error);
  }
  process.exit(1);
});
