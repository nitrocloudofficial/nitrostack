import fs from "fs";
import path from "path";

import { Employee } from "../models/employee.js";
import { Project } from "../models/project.js";
import { Commit } from "../models/commit.js";
import { Meeting } from "../models/meeting.js";
import { Document } from "../models/document.js";

export class DataService {

  private static load<T>(file: string): T {
    return JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", file),
        "utf8"
      )
    ) as T;
  }

  static employees(): Employee[] {
    return this.load<Employee[]>("employees.json");
  }

  static projects(): Project[] {
    return this.load<Project[]>("projects.json");
  }

  static commits(): Commit[] {
    return this.load<Commit[]>("commits.json");
  }

  static meetings(): Meeting[] {
    return this.load<Meeting[]>("meetings.json");
  }

  static documents(): Document[] {
    return this.load<Document[]>("documents.json");
  }
}