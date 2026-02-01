import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 原生模块 duckdb 及其 node-pre-gyp 不参与打包，由 Node 运行时加载
  serverExternalPackages: ["duckdb", "@mapbox/node-pre-gyp"],
};

export default nextConfig;
