import type { NextConfig } from "next";
import { dirname, join } from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(dirname(""), "../../"),
};

export default nextConfig;
