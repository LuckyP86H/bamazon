// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  // Sessions and images are handled in the app (a signed cart cookie, no image transforms), so
  // the adapter's default KV session store and Images binding are switched off.
  adapter: cloudflare({ imageService: "passthrough" }),
  session: false,
  devToolbar: { enabled: false },
});
