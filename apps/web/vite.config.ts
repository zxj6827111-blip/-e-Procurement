import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (normalizedId.includes("/gemini-react/features/views/")) return "react-business-views";
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) return "charts-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "react-vendor";
          if (id.includes("/@vue/") || id.includes("/vue/") || id.includes("vue-router") || id.includes("pinia")) return "vue-vendor";
          return "vendor";
        }
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/health": "http://127.0.0.1:3000"
    }
  }
});
