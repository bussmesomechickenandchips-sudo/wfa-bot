/**
 * Persistent team storage backed by a JSON file.
 * All reads and writes are synchronous to keep the API simple.
 *
 * Schema:
 * {
 *   "teams": [
 *     {
 *       "roleId":    "string",          // Discord role ID
 *       "ownerId":   "string | null",   // User ID of the team owner
 *       "imageUrl":  "string | null",   // Optional thumbnail shown in embeds
 *       "memberIds": ["string"]         // User IDs of signed/appointed players
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

// ── I/O helpers ─────────────────────────────────────────────────────────────

function load() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const blank = { teams: [] };
    writeFileSync(DATA_FILE, JSON.stringify(blank, null, 2), "utf8");
    return blank;
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    // Migrate old schema ({ roleIds: [] }) to new schema ({ teams: [] })
    if (!Array.isArray(parsed.teams)) {
      const migrated = { teams: [] };
      writeFileSync(DATA_FILE, JSON.stringify(migrated, null, 2), "utf8");
      return migrated;
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

// ── Public API ───────────────────────────────────────────────────────────────

/** Return every team. */
export function getTeams() {
  return load().teams;
}

/** Return a single team by role ID, or undefined. */
export function getTeam(roleId) {
  return load().teams.find((t) => t.roleId === roleId);
}

/**
 * Add a new team.
 * @returns {{ added: boolean }} false if the role is already registered.
 */
export function addTeam(roleId, { ownerId = null, imageUrl = null } = {}) {
  const data = load();
  if (data.teams.some((t) => t.roleId === roleId)) return { added: false };
  data.teams.push({ roleId, ownerId, imageUrl, memberIds: [] });
  save(data);
  return { added: true };
}

/**
 * Remove a team entirely.
 * @returns {{ removed: boolean }}
 */
export function removeTeam(roleId) {
  const data = load();
  const idx = data.teams.findIndex((t) => t.roleId === roleId);
  if (idx === -1) return { removed: false };
  data.teams.splice(idx, 1);
  save(data);
  return { removed: true };
}

/**
 * Set (or replace) the owner of a team.
 * @returns {{ updated: boolean }}
 */
export function setTeamOwner(roleId, ownerId) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { updated: false };
  team.ownerId = ownerId;
  save(data);
  return { updated: true };
}

/**
 * Update the image URL on an existing team.
 * @returns {{ updated: boolean }}
 */
export function setTeamImage(roleId, imageUrl) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { updated: false };
  team.imageUrl = imageUrl;
  save(data);
  return { updated: true };
}

/**
 * Add a player to a team's member list.
 * @returns {{ added: boolean }}
 */
export function addMemberToTeam(roleId, userId) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { added: false };
  if (team.memberIds.includes(userId)) return { added: false };
  team.memberIds.push(userId);
  save(data);
  return { added: true };
}

/**
 * Remove a player from a team's member list.
 * @returns {{ removed: boolean }}
 */
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

/**
 * Remove ALL members from a team without deleting the team itself.
 * Returns the list of member IDs that were cleared.
 */
export function disbandTeamMembers(roleId) {
  const data = load();
  const team = data.teams.find((t) => t.roleId === roleId);
  if (!team) return { cleared: false, memberIds: [] };
  const memberIds = [...team.memberIds];
  team.memberIds = [];
  save(data);
  return { cleared: true, memberIds };
}

/**
 * Find which team (if any) a user is currently a member of.
 * @returns {object|null}
 */
export function getUserTeam(userId) {
  return load().teams.find((t) => t.memberIds.includes(userId)) ?? null;
}

/**
 * Find the team owned by a given user.
 * @returns {object|null}
 */
export function getTeamByOwner(userId) {
  return load().teams.find((t) => t.ownerId === userId) ?? null;
}
