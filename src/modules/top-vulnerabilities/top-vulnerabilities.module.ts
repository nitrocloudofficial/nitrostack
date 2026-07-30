/**
 * Top Vulnerabilities Module
 * Manages storage and retrieval of the top 3 vulnerabilities in the database.
 */

import { Module } from "@nitrostack/core";
import { TopVulnerabilitiesTools } from "./top-vulnerabilities.tools.js";

@Module({
  name: "top-vulnerabilities",
  description: "Manages storage and retrieval of the top 3 vulnerabilities in the database.",
  controllers: [TopVulnerabilitiesTools],
})
export class TopVulnerabilitiesModule {}
