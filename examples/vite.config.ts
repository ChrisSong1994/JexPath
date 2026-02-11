import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  base: "/JexPath/",
  plugins: [react()],
  resolve: {
    alias: {
      // 强制将库的引用指向源码目录，实现源码级调试
      "@fett/jexpath": path.resolve(__dirname, "../src/index.ts"),
    },
  },
  server: {
    fs: {
      // 允许 Vite 访问 examples 目录之外的源码
      allow: [".."],
    },
  },
});
