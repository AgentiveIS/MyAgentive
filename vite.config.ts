import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = env.PORT || "3847";

  return {
    plugins: [react()],
    root: "client",
    server: {
      proxy: {
        "/api": `http://localhost:${port}`,
        "/ws": {
          target: `ws://localhost:${port}`,
          ws: true,
        },
      },
    },
    build: {
      outDir: "../dist",
    },
  };
});
