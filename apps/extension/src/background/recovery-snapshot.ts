import { createIpcMessage, type ExtensionSnapshotPayload } from '@ase/core';

import { sendIpcMessage } from './companion.js';

export async function sendExtensionSnapshot(): Promise<void> {
  const extensions = await listBrowserExtensions();
  const message = createIpcMessage('EXTENSION_SNAPSHOT', {
    extensions,
  } satisfies ExtensionSnapshotPayload);
  await sendIpcMessage(message);
}

async function listBrowserExtensions(): Promise<ExtensionSnapshotPayload['extensions']> {
  if (!chrome.management?.getAll) {
    return [];
  }

  return new Promise((resolve) => {
    chrome.management.getAll((items) => {
      resolve(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          version: item.version,
          enabled: item.enabled,
          installType: item.installType,
        })),
      );
    });
  });
}
