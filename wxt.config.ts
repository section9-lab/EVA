import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
// export default defineConfig({
//   modules: ['@wxt-dev/module-react'],
// });



export default defineConfig({
  manifest: {
    name: 'My Side Panel Extension',
    version: '1.0',
    description: 'A simple side panel browser extension using WXT.',
    offline_enabled: true,
    minimum_chrome_version: "114",
    permissions: ["sidePanel"],
    side_panel: {
      default_path: 'pages/sidepanel.html', 
      openPanelOnActionClick: true
    },
  },
});