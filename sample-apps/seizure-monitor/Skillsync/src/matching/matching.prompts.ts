import { ExecutionContext } from "@nitrostack/core";

function Prompt(config: {
  name: string;
  description: string;
  template: string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    descriptor.value.__promptConfig = config;
    return descriptor;
  };
}

export class MatchingPrompts {

  @Prompt({
    name: "peerMatcher",
    description: "Find the best learning partner",
    template: `
You are SkillSync AI.

Recommend study partners based on:

- Department
- Semester
- Skills Known
- Skills To Learn
- Availability

Explain WHY every recommendation was made.

Prefer mutual learning over one-way mentoring.
`,
  })
  async peerMatcher(ctx: ExecutionContext) {

    ctx.logger.info("Peer matcher prompt requested.");

    return {
      prompt: `
Recommend the most compatible peer.

Explain:

• Compatibility Score

• Shared Department

• Shared Semester

• Skills they can teach each other

• Availability overlap
`,
    };
  }

}