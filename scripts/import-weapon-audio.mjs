import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Explicit public assets only. Their upstream sources and licences are in public/audio/CREDITS.md.
const root = new URL('../public/audio/', import.meta.url);
const raw =
  'https://raw.githubusercontent.com/DeathByDenim/openspades-free-pak/main/Sounds/Weapons/';
const files = {
  'pistol-9mm.mp3': 'https://cdn.freesound.org/previews/427/427592_3094998-hq.mp3',
  'rifle-556.mp3': 'https://cdn.freesound.org/previews/427/427596_3094998-hq.mp3',
  'desert-eagle.mp3': 'https://cdn.freesound.org/previews/151/151071_2732486-hq.mp3',
  'ak47.opus': `${raw}SMG/FireFar.opus`,
  'rifle-close.opus': `${raw}Rifle/FireLocal.opus`,
  'shotgun.opus': `${raw}Shotgun/FireStereo.opus`,
  'magazine.opus': `${raw}Rifle/ReloadLocal.opus`,
  'mechanism.opus': `${raw}Rifle/RaiseLocal.opus`,
  'pump.opus': `${raw}Shotgun/ReloadLocal.opus`,
};
await mkdir(root, { recursive: true });
const manifest = {};
for (const [name, url] of Object.entries(files)) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (
    buffer.length < 1000 ||
    buffer.length > 500000 ||
    (name.endsWith('.opus') && buffer.subarray(0, 4).toString() !== 'OggS') ||
    buffer.subarray(0, 40).toString().includes('<html')
  )
    throw new Error(`Invalid audio: ${name}`);
  await writeFile(new URL(name, root), buffer);
  manifest[name] = {
    url,
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
  console.log(`Downloaded ${name}: ${buffer.length} bytes`);
}
await writeFile(new URL('manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
