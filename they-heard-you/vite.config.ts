import { defineConfig } from 'vite';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Dev server only: the game reports what its TV is doing (browser, playable formats, the video decks, autoplay)
// and this writes it to node_modules/.cache/they-heard-you/, so a TV problem on someone's machine can be read
// instead of guessed at. tv-report.json is the latest report; tv-report.log is every report since the server
// started. Not part of any build.
const folder = join(process.cwd(), 'node_modules', '.cache', 'they-heard-you');

export default defineConfig({
  plugins: [{
    name: 'they-heard-you-tv-report',
    apply: 'serve',
    configureServer(server) {
      // One pair of files per dev server port, so two servers never overwrite each other's reports.
      const port = server.config.server.port ?? 5173;
      const latest = join(folder, `tv-report-${port}.json`);
      const history = join(folder, `tv-report-${port}.log`);
      mkdirSync(folder, { recursive: true });
      writeFileSync(history, '');
      server.ws.on('they-heard-you:tv', report => {
        const line = JSON.stringify({ at: new Date().toISOString(), ...report });
        writeFileSync(latest, `${JSON.stringify(JSON.parse(line), null, 2)}\n`);
        appendFileSync(history, `${line}\n`);
      });
    },
  }],
});
