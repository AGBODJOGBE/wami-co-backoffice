/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
