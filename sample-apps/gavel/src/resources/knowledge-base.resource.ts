import { ControllerDecorator as Controller, ResourceDecorator as Resource } from "@nitrostack/core";
import * as fs from "fs/promises";
import * as path from "path";

@Controller()
export class KnowledgeBaseResource {
  @Resource({
    uri: "knowledge://frontend-libraries",
    name: "Frontend Libraries Knowledge Base",
    description: "Curated dataset of 6 UI & animation libraries containing bundle sizes, GPU costs, and framework compatibility.",
    mimeType: "application/json",
  })
  async read() {
    const dataPath = path.join(process.cwd(), "src", "data", "library-knowledge-base.json");
    const content = await fs.readFile(dataPath, "utf-8");
    return content;
  }
}
