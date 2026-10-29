import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base: './' zaroori hai taake Capacitor (Android app) mein files mil jayein.
// viteSingleFile sab kuch aik index.html mein daal deta hai (share karna asaan).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
});
