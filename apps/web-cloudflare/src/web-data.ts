import type { Context } from "hono";
import type { Settings } from "@prompthub/shared/types";
import { ErrorCode, failure, readJson, success } from "./response";
import { loadSnapshot, saveSnapshot } from "./sync";
import type { AuthUser, Env } from "./types";

type AppContext = Context<{ Bindings: Env; Variables: { authUser: AuthUser } }>;

function getUser(c: AppContext): AuthUser {
  return c.get("authUser");
}

async function getUserSnapshot(c: AppContext) {
  return loadSnapshot(c.env.DB, getUser(c).userId);
}

function notFound(c: AppContext, label: string): Response {
  return failure(c, 404, ErrorCode.NOT_FOUND, `${label} not found`);
}

export async function listPrompts(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  return success(c, snapshot.prompts);
}

export async function getPrompt(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  const prompt = snapshot.prompts.find((item) => item.id === c.req.param("id"));
  return prompt ? success(c, prompt) : notFound(c, "Prompt");
}

export async function listPromptVersions(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  const promptId = c.req.param("id");
  const versions = (snapshot.promptVersions || snapshot.versions || []).filter((item) => item.promptId === promptId);
  return success(c, versions);
}

export async function listPromptTags(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  const tags = new Set<string>();
  for (const prompt of snapshot.prompts) {
    for (const tag of prompt.tags || []) {
      if (tag) {
        tags.add(tag);
      }
    }
  }
  return success(c, Array.from(tags).sort((a, b) => a.localeCompare(b)));
}

export async function listFolders(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  return success(c, snapshot.folders);
}

export async function listSkills(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  return success(c, snapshot.skills);
}

export async function getSkill(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  const skill = snapshot.skills.find((item) => item.id === c.req.param("id"));
  return skill ? success(c, skill) : notFound(c, "Skill");
}

export async function listSkillVersions(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  const skillId = c.req.param("id");
  const versions = (snapshot.skillVersions || []).filter((item) => item.skillId === skillId);
  return success(c, versions);
}

export async function listRules(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  return success(c, (snapshot.rules || []).map((rule) => ({
    id: rule.id,
    platformId: rule.platformId,
    platformName: rule.platformName,
    platformIcon: rule.platformIcon,
    platformDescription: rule.platformDescription,
    name: rule.name,
    description: rule.description,
    path: rule.path,
    exists: true,
    group: rule.projectRootPath ? "workspace" : "assistant",
    managedPath: rule.managedPath,
    targetPath: rule.targetPath,
    projectRootPath: rule.projectRootPath,
    syncStatus: rule.syncStatus,
  })));
}

export async function readRule(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  const rule = (snapshot.rules || []).find((item) => item.id === c.req.param("id"));
  if (!rule) {
    return notFound(c, "Rule");
  }
  return success(c, {
    ...rule,
    exists: true,
    group: rule.projectRootPath ? "workspace" : "assistant",
  });
}

export async function getSettings(c: AppContext): Promise<Response> {
  const snapshot = await getUserSnapshot(c);
  return success(c, snapshot.settings || {});
}

export async function putSettings(c: AppContext): Promise<Response> {
  const user = getUser(c);
  const patch = await readJson<Record<string, unknown>>(c);
  const snapshot = await loadSnapshot(c.env.DB, user.userId);
  const current: Settings = snapshot.settings && typeof snapshot.settings === "object"
    ? snapshot.settings
    : { theme: "system", language: "zh", autoSave: true };
  snapshot.settings = {
    ...current,
    ...patch,
  };
  snapshot.settingsUpdatedAt = new Date().toISOString();
  snapshot.exportedAt = snapshot.settingsUpdatedAt;
  await saveSnapshot(c.env.DB, user.userId, snapshot);
  return success(c, true);
}
