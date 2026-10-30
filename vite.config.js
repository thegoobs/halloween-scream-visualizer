import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the root of https://scream.gschoolar.dev on GitHub Pages.
const BASE = "/";

export default defineConfig({ base: BASE, plugins: [react()] });
