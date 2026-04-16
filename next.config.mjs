/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" mode bundles only the files needed to run the server.
  // Required for Electron production packaging (electron:build scripts).
  // Has no effect on `next dev` or Vercel deployments.
  output: process.env.ELECTRON_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
