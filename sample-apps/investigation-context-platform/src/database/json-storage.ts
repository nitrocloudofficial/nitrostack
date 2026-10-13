import fs from "fs";
import path from "path";
import { Investigation } from "../modules/investigation/investigation.data.js";
import { Entity } from "../modules/entities/entities.data.js";

const FILE_PATH = path.join(process.cwd(), "data", "investigations.json");

export function loadInvestigations(): Investigation[] {
    if (!fs.existsSync(FILE_PATH)) {
        return [];
    }

    const data = fs.readFileSync(FILE_PATH, "utf8");
    return JSON.parse(data);
}

export function saveInvestigations(
    investigations: Investigation[]
): void {
    fs.writeFileSync(
        FILE_PATH,
        JSON.stringify(investigations, null, 2),
        "utf8"
    );
}

const ENTITY_FILE = path.join(process.cwd(), "data", "entities.json");

export function loadEntities(): Entity[] {

    if (!fs.existsSync(ENTITY_FILE))
        return [];

    return JSON.parse(fs.readFileSync(ENTITY_FILE, "utf8"));
}

export function saveEntities(entities: Entity[]) {

    fs.writeFileSync(
        ENTITY_FILE,
        JSON.stringify(entities, null, 2),
        "utf8"
    );
}