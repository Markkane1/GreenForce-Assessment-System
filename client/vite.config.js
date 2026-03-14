import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('read-excel-file')) {
            return 'read-excel-file';
          }

          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-vendor';
          }

          if (id.includes('axios') || id.includes('jwt-decode')) {
            return 'app-vendor';
          }

          if (id.includes('lucide-react')) {
            return 'ui-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
