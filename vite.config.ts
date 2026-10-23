import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

const root=fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  resolve: { alias: [
    {find: /^@\/db$/,replacement: root+'src/db/sqlite/direct.ts'},
    {find: /^@\/db\/(.*)$/,replacement: root+'src/db/sqlite/$1'}
  ] },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
