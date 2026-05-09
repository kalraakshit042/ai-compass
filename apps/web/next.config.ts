import type { NextConfig } from "next";
import { dirname, join } from "path";

const BASE_PATH = "/projects/aicompass";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  outputFileTracingRoot: join(dirname(""), "../../"),
};

export default nextConfig;
