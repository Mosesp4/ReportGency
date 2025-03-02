/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverActions: true, // Ensures that dynamic server actions work correctly
    },
    output: "standalone", // Ensures compatibility with dynamic API routes
  };
  
  export default nextConfig;
  