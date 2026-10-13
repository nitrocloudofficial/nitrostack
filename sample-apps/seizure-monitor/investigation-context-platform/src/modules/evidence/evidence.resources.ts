import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class EvidenceResources {

  @Resource({
    uri: "evidence://list",
    name: "Evidence List",
    description: "List all evidence items",
    mimeType: "application/json",
  })
  async getEvidence(uri: string, ctx: ExecutionContext) {

    ctx.logger.info("Fetching evidence");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              evidence: [],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}