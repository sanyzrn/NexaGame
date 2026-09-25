import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packAssets } from './scripts/pack-assets.ts';

/** In dev: pack /assets-src on start and re-pack + reload whenever a source PNG changes. */
function assetPipeline(): Plugin {
  const srcDir = fileURLToPath(new URL('./assets-src', import.meta.url));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = Promise.resolve();
  return {
    name: 'darafsh-assets',
    apply: 'serve',
    async buildStart() {
      await packAssets();
    },
    configureServer(server) {
      server.watcher.add(srcDir);
      const onChange = (file: string) => {
        if (!resolve(file).startsWith(srcDir)) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          running = running
            .then(() => packAssets())
            .then(() => server.ws.send({ type: 'full-reload' }))
            .catch((err) => server.config.logger.error(`[assets] ${String(err)}`));
        }, 250);
      };
      server.watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [assetPipeline()],
  server: {
    host: false,
    // Quick tunnels for testing inside Telegram (npm run tunnel)
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: { allowedHosts: ['.trycloudflare.com'] },
  build: {
    target: 'es2020',
    assetsDir: 'bundle',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
  },
});
