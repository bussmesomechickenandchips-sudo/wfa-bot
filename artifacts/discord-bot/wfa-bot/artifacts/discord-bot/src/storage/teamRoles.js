/**
 * Persistent team storage backed by a JSON file.
 *
 * Schema:
 * {
 *   "teams": [
 *     {
 *       "roleId":       "string",
 *       "ownerId":      "string | null",
 *       "imageUrl":     "string | null",
 *       "rosterLimit":  "number | null",   // max players (excluding owner); null = unlimited
 *       "memberIds":    ["string"]
 *     }
 *   ]
 * }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "team-roles.json");

function load() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const blank = { teams: [] };
    writeFileSync(DATA_FILE, JSON.stringify(blank, null, 2), "utf8");
    return blank;
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    if (!Array.isArray(parsed.teams)) {
      const migrated = { teams: [] };
      writeFileSync(DATA_FILE, JSON.stringify(migrated, null, 2), "utf8");
      return migrated;
    }
    // Ensure every team has a rosterLimit field
    for (const t of parsed.teams) {
      if (!("rosterLimit" in t)) t.rosterLimit = null;
    }
    return parsed;
  } catch {
    const blank = { teams: [] };
    writeFileSync(DATA_FILE, JSON.stringify(blank, null, 2), "utf8");
    return blank;
  }
}

function save(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function getTeams() {
  return load().teams;
}

export function getTeam(roleId) {
  return load().teams.find((t) => t.roleId === roleId);
}

export function addTeam(roleId, { ownerId = null, imageUrl = null } = {}) {
  const data = load();
  if (data.teams.some((t) => t.roleId === roleId)) return { added: false };
  data.teams.push({ roleId, ownerId, imageUrl, rosterLimit: null, memberIds: [] });
  save(data);
  return { added: true };
}

export function removeTeam(roleId) {
  const data = load();
  const idx = data.teams.findIndex((t) => t.roleId === roleId);
  if (idx === -1) return { removed: false };
  data.teams.splice(idx, 1);
  save(data);
  return { removed: true };
}

export function setTeamOwner(roleId, ownerId) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { updated: false };
  team.ownerId = ownerId;
  save(data);
  return { updated: true };
}

export function setTeamImage(roleId, imageUrl) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { updated: false };
  team.imageUrl = imageUrl;
  save(data);
  return { updated: true };
}

/**
 * Set or clear the roster limit for a team.
 * @param {string} roleId
 * @param {number|null} limit  null = unlimited
 */
export function setRosterLimit(roleId, limit) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { updated: false };
  team.rosterLimit = limit;
  save(data);
  return { updated: true };
}

export function addMemberToTeam(roleId, userId) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { added: false };
  if (team.memberIds.includes(userId)) return { added: false };
  team.memberIds.push(userId);
  save(data);
  return { added: true };
}

export function removeMemberFromTeam(roleId, userId) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { removed: false };
  const idx = team.memberIds.indexOf(userId);
  if (idx === -1) return { removed: false };
  team.memberIds.splice(idx, 1);
  save(data);
  return { removed: true };
}

export function disbandTeamMembers(roleId) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { cleared: false, memberIds: [], ownerId: null };
  const memberIds = [...team.memberIds];
  const ownerId = team.ownerId;
  team.memberIds = [];
  team.ownerId = null;
  save(data);
  return { cleared: true, memberIds, ownerId };
}

export function getUserTeam(userId) {
  return load().teams.find((t) => t.memberIds.includes(userId)) ?? null;
}

export function getTeamByOwner(userId) {
  return load().teams.find((t) => t.ownerId === userId) ?? null;
}
