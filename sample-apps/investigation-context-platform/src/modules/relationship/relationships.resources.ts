import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class RelationshipResources {

  @Resource({
    uri: "relationship://graph",

    name: "Relationship Graph",

    description: "All investigation relationships",

    mimeType: "application/json",
  })
  async graph(uri: string, ctx: ExecutionContext) {

    return {

      contents: [

        {

          uri,

          mimeType: "application/json",

          text: JSON.stringify({

            relationships: [],

          }, null, 2),

        },

      ],

    };
  }
}