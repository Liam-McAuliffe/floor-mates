const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',

        port: '',
        pathname: '/**',
      },
    ],
  },
};
export default nextConfig;
