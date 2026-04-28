import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita empaquetar `pdf-parse`: su index ejecuta un bloque de test si `module.parent` queda undefined.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
