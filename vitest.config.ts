import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@modules': path.resolve(__dirname, './modules'),
      '@shared': path.resolve(__dirname, './shared'),
      '@generated': path.resolve(__dirname, './generated'),
      '@utils': path.resolve(__dirname, './utils'),
      '@styles': path.resolve(__dirname, './styles'),
      '@themes': path.resolve(__dirname, './themes'),
      '@types': path.resolve(__dirname, './types'),
    },
  },
});
