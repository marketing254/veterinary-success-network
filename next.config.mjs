/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The mailer attaches public/brand/vsn-monogram-light.png inline (cid:vsn-logo);
    // make sure serverless functions ship the file.
    outputFileTracingIncludes: { "/api/**": ["./public/brand/vsn-monogram-light.png", "./public/brand/vsn-monogram-dark.png"] },
  },
};

export default nextConfig;
