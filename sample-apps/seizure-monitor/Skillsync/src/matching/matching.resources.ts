import { ExecutionContext } from "@nitrostack/core";

function Resource(config: {
  name: string;
  description: string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    if (!target.__resources) {
      target.__resources = [];
    }

    target.__resources.push({
      ...config,
      method: propertyKey,
    });

    return descriptor;
  };
}

export class MatchingResources {

  @Resource({
    name: "matchingAlgorithm",
    description: "Explains how SkillSync AI matches students",
  })
  async getAlgorithm(ctx: ExecutionContext) {

    ctx.logger.info("Providing matching algorithm.");

    return {
      algorithm: {
        department: 20,
        semester: 15,
        teachableSkills: 20,
        learnableSkills: 20,
        availability: 25,
        maximumScore: 100,
      },
    };
  }

}