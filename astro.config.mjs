import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  security: {
    // Only flip this if you run into POST/form issues on the edge:
    checkOrigin: false
  }
});
