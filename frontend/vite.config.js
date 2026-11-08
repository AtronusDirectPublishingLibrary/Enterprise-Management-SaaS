import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("chart.js") || id.includes("react-chartjs-2") || id.includes("node_modules/d3")) {
            return "charts";
          }
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("node_modules/react/")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
