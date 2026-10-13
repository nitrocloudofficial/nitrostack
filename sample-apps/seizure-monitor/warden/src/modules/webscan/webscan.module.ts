import { Module } from "@nitrostack/core";
import { WebscanTools } from "./webscan.tools.js";

@Module({
  name: "webscan",
  description:
    "Scans a live website's HTTP security headers, common exposed-file paths, TLS certificate, tech fingerprint, " +
    "and raw HTML markup for client-side vulnerability patterns.",
  controllers: [WebscanTools],
})
export class WebscanModule {}
