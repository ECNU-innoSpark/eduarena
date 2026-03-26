import { defineConfig } from "vite";

const apiPort = Number(process.env.API_PORT || "5174");

export default defineConfig({
  server: {
    allowedHosts: ["nat2-notebook-inspire.sii.edu.cn"],
    host: "0.0.0.0",
    port: 8081,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
      },
    },
  },
});
