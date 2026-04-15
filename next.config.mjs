/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a standalone server bundle — required for the Docker image
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
  // Required for Three.js to bundle correctly
  transpilePackages: ['three'],
};

export default nextConfig;
