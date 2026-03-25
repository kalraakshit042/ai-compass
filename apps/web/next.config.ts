import type { NextConfig } from "next";
import { dirname, join } from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: "/aicompass",
  outputFileTracingRoot: join(dirname(""), "../../"),
};

export default nextConfig;
