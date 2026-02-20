import type { NextConfig } from "next";
import { startServer } from "@react-grab/claude-code/server";

if (process.env.NODE_ENV === "development") {
  startServer();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
