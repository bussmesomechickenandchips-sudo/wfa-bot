/**
 * Persistent storage for team roles using a JSON file.
 * Survives bot restarts — reads from disk on load, writes on every change.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the data directory relative to the package root (two levels up from src/storage)
const DATA_DIR = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "team-roles.json");

/**
 * Ensure the data directory and file exist, return parsed data.
 * @returns {{ roleIds: string[] }}
 */
function loadData() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ roleIds: [] }, null, 2), "utf8");
    return { roleIds: [] };
  }
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    // If the file is corrupted, reset it
    writeFileSync(DATA_FILE, JSON.stringify({ roleIds: [] }, null, 2), "utf8");
    return { roleIds: [] };
  }
}

/**
 * Persist current state to disk.
 * @param {{ roleIds: string[] }} data
 */
function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Return all stored team role IDs.
 * @returns {string[]}
 */
export function getTeamRoleIds() {
  return loadData().roleIds;
}

/**
 * Add a role ID to the team list. No-ops if already present.
 * @param {string} roleId
 * @returns {{ added: boolean }}
 */
export function addTeamRole(roleId) {
  const data = loadData();
  if (data.roleIds.includes(roleId)) {
    return { added: false };
  }
  data.roleIds.push(roleId);
  saveData(data);
  return { added: true };
}

/**
 * Remove a role ID from the team list.
 * @param {string} roleId
 * @returns {{ removed: boolean }}
 */
export function removeTeamRole(roleId) {
  const data = loadData();
  const index = data.roleIds.indexOf(roleId);
  if (index === -1) {
    return { removed: false };
  }
  data.roleIds.splice(index, 1);
  saveData(data);
  return { removed: true };
}
