import { ResourceDecorator as Resource, Injectable, ExecutionContext } from "@nitrostack/core";

@Injectable()
export class AnalyticsResources {
  @Resource({
    uri: "analytics://summary",
    name: "Analytics Summary",
    description: "Provides a JSON summary of analytics data.",
    mimeType: "application/json",
  })
  async summary(uri: string, context: ExecutionContext) {
    context.logger.info("Serving analytics summary resource.");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              securityScore: 85,
              complianceScore: 78,
              trustScore: 92,
              riskScore: 22,
              activeAgents: 12,
              activeIncidents: 4,
              healthyConnectors: 6,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
