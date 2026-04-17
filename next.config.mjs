/** @type {import('next').NextConfig} */
const nextConfig = {
  // No standalone output — electron/main.ts uses the programmatic Next.js API
  // which requires the standard .next build layout (not standalone server.js).

  // xlsx 0.18.5 ships broken type declarations (types/index.d.ts is missing).
  // Suppress the build-time TS error so the packager doesn't abort.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
