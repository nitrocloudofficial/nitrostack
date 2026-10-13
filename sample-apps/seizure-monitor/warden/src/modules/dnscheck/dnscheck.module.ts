import { Module } from "@nitrostack/core";
import { DnscheckTools } from "./dnscheck.tools.js";

@Module({
  name: "dnscheck",
  description: "Checks a domain's SPF/DMARC/DKIM email-spoofing defenses via DNS TXT lookups.",
  controllers: [DnscheckTools],
})
export class DnscheckModule {}
