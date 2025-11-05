import { CHAT_LINK_BUILD_TEMPLATE_TYPE } from './constants.js';

export function decodeChatCode(link: string): Uint8Array {
  const trimmed = link.trim();
  if (!trimmed.startsWith('[&') || !trimmed.endsWith(']')) {
    throw new Error('Invalid chat link format. Links must be wrapped in [& and ].');
  }
  const payload = trimmed.slice(2, -1);
  const bytes = Buffer.from(payload, 'base64');
  return new Uint8Array(bytes);
}

export function encodeChatCode(bytes: Uint8Array): string {
  const payload = Buffer.from(bytes).toString('base64');
  return `[&${payload}]`;
}

export function ensureBuildTemplate(bytes: Uint8Array): void {
  if (bytes.length === 0 || bytes[0] !== CHAT_LINK_BUILD_TEMPLATE_TYPE) {
    throw new Error('Chat link is not a build template.');
  }
}
