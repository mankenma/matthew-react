// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Enable serverless functions for API routes
  adapter: netlify(), // Build API routes as Netlify Functions
  integrations: [react()]
});