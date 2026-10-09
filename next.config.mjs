/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Files Vercel's tracer misses:
    //  - the VSN logos read from disk by the mailer (cid:vsn-logo) and the agreement PDF
    //  - pdfkit's standard font metrics, loaded lazily via require("#standard-fonts/Helvetica");
    //    without them every agreement PDF render throws on Vercel (works locally, full node_modules).
    outputFileTracingIncludes: {
      "/api/**": [
        "./public/brand/vsn-monogram-light.png",
        "./public/brand/vsn-monogram-dark.png",
        "./node_modules/pdfkit/js/standard-fonts/**",
        "./node_modules/pdfkit/js/data/**",
      ],
    },
  },
};

export default nextConfig;
