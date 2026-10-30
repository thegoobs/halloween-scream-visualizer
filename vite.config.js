import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://thegoobs.github.io/halloween-scream-visualizer/ on GitHub Pages.
const BASE = "/halloween-scream-visualizer/";

export default defineConfig({ base: BASE, plugins: [react()] });
