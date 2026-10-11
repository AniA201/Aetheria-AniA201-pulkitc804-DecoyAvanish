// Test helper: reads the saved NCT03238781 snapshot from disk. Not imported by the app.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleTrial, publicNct, type TrialData } from "./publicTrial";

const read = (name: string) => JSON.parse(readFileSync(resolve(__dirname, "../../public/trials", publicNct, name), "utf8"));

export function fixtureTrial(): TrialData {
  return assembleTrial(publicNct, read("registry.json"), read("protocol.json"), read("sap.json"), read("peers.json"));
}
