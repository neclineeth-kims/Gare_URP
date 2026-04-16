/** @type {import('next').NextConfig} */
const nextConfig = {
  // No standalone output — electron/main.ts uses the programmatic Next.js API
  // which requires the standard .next build layout (not standalone server.js).
};

export default nextConfig;
