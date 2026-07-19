import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pages = [
  'index.html',
  'dashboard-analytics.html',
  'dashboard-ecommerce.html',
  'dashboard-crm.html',
  'dashboard-project-management.html',
  'dashboard-finance.html',
  'dashboard-marketing.html',
  'dashboard-saas.html',
  'dashboard-ai-insights.html',
  'users.html',
  'projects.html',
  'orders.html',
  'file-manager.html',
  'messages.html',
  'calendar.html',
  'finance.html',
  'reports.html',
  'invoices.html',
  'tables.html',
  'charts.html',
  'apps.html',
  'ai-tools.html',
  'pages.html',
  'forms.html',
  'ui-elements.html',
  'settings.html',
  'client-preview.html'
];

// Vite receives every HTML shell as an entry so all pages are available in dev
// and production while keeping the JSON-driven page structure unchanged.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page.replace(/\.html$/, ''), resolve(__dirname, page)])
      )
    }
  }
});
