import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The backend builds counselor setup-profile links against
    // COUNSELOR_PORTAL_URL || 'http://localhost:5174', so this port is not
    // arbitrary - an invited counselor's link points here. strictPort stops Vite
    // silently relocating to 5175+ when something else already holds 5174,
    // which would leave those links pointing at whatever did claim the port.
    port: 5174,
    strictPort: true,
  },
});
