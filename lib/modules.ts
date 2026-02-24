import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

export type CourseModule = {
  id: string;
  classId: string;
  parentId?: string;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: string;
};

export type ModuleResource = {
  id: string;
  moduleId: string;
  title: string;
  resourceType: "file" | "link";
  fileName?: string;
  mimeType?: string;
  size?: number;
  contentBase64?: string;
  linkUrl?: string;
  createdAt: string;
};

const MODULE_FILE = "course-modules.json";
const RESOURCE_FILE = "module-resources.json";

type DbModule = {
  id: string;
  class_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
};

type DbResource = {
  id: string;
  module_id: string;
  title: string;
  resource_type: string;
  file_name: string | null;
  mime_type: string | null;
  size: number | null;
  content_base64: string | null;
  link_url: string | null;
  created_at: string;
};

function mapModule(row: DbModule): CourseModule {
  return {
    id: row.id,
    classId: row.class_id,
    parentId: row.parent_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    orderIndex: row.order_index ?? 0,
    createdAt: row.created_at
  };
}

function mapResource(row: DbResource): ModuleResource {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    resourceType: (row.resource_type as ModuleResource["resourceType"]) ?? "file",
    fileName: row.file_name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    size: row.size ?? undefined,
    contentBase64: row.content_base64 ?? undefined,
    linkUrl: row.link_url ?? undefined,
    createdAt: row.created_at
  };
}

export async function getModulesByClass(classId: string): Promise<CourseModule[]> {
  if (!isDbEnabled()) {
    const list = readJson<CourseModule[]>(MODULE_FILE, []);
    return list.filter((item) => item.classId === classId).sort((a, b) => a.orderIndex - b.orderIndex);
  }
  const rows = await query<DbModule>(
    "SELECT * FROM course_modules WHERE class_id = $1 ORDER BY order_index ASC, created_at ASC",
    [classId]
  );
  return rows.map(mapModule);
}

export async function getModuleById(id: string): Promise<CourseModule | null> {
  if (!isDbEnabled()) {
    const list = readJson<CourseModule[]>(MODULE_FILE, []);
    return list.find((item) => item.id === id) ?? null;
  }
  const row = await queryOne<DbModule>("SELECT * FROM course_modules WHERE id = $1", [id]);
  return row ? mapModule(row) : null;
}

export async function createModule(input: {
  classId: string;
  title: string;
  description?: string;
  parentId?: string;
  orderIndex?: number;
}): Promise<CourseModule> {
  const createdAt = new Date().toISOString();
  const next: CourseModule = {
    id: `mod-${crypto.randomBytes(6).toString("hex")}`,
    classId: input.classId,
    parentId: input.parentId,
    title: input.title,
    description: input.description,
    orderIndex: input.orderIndex ?? 0,
    createdAt
  };
  if (!isDbEnabled()) {
    const list = readJson<CourseModule[]>(MODULE_FILE, []);
    list.push(next);
    writeJson(MODULE_FILE, list);
    return next;
  }
  const row = await queryOne<DbModule>(
    `INSERT INTO course_modules (id, class_id, parent_id, title, description, order_index, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      next.id,
      next.classId,
      next.parentId ?? null,
      next.title,
      next.description ?? null,
      next.orderIndex,
      createdAt
    ]
  );
  return row ? mapModule(row) : next;
}

export async function updateModule(input: {
  id: string;
  title?: string;
  description?: string;
  parentId?: string | null;
  orderIndex?: number;
}) {
  if (!isDbEnabled()) {
    const list = readJson<CourseModule[]>(MODULE_FILE, []);
    const index = list.findIndex((item) => item.id === input.id);
    if (index === -1) return null;
    const next = {
      ...list[index],
      title: input.title ?? list[index].title,
      description: input.description ?? list[index].description,
      parentId: input.parentId === undefined ? list[index].parentId : input.parentId ?? undefined,
      orderIndex: input.orderIndex ?? list[index].orderIndex
    };
    list[index] = next;
    writeJson(MODULE_FILE, list);
    return next;
  }

  const row = await queryOne<DbModule>(
    `UPDATE course_modules
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         parent_id = COALESCE($4, parent_id),
         order_index = COALESCE($5, order_index)
     WHERE id = $1
     RETURNING *`,
    [input.id, input.title ?? null, input.description ?? null, input.parentId ?? null, input.orderIndex ?? null]
  );
  return row ? mapModule(row) : null;
}

export async function getModuleResources(moduleId: string): Promise<ModuleResource[]> {
  if (!isDbEnabled()) {
    const list = readJson<ModuleResource[]>(RESOURCE_FILE, []);
    return list.filter((item) => item.moduleId === moduleId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const rows = await query<DbResource>(
    "SELECT * FROM module_resources WHERE module_id = $1 ORDER BY created_at DESC",
    [moduleId]
  );
  return rows.map(mapResource);
}

export async function addModuleResource(input: {
  moduleId: string;
  title: string;
  resourceType: "file" | "link";
  fileName?: string;
  mimeType?: string;
  size?: number;
  contentBase64?: string;
  linkUrl?: string;
}): Promise<ModuleResource> {
  const createdAt = new Date().toISOString();
  const next: ModuleResource = {
    id: `res-${crypto.randomBytes(6).toString("hex")}`,
    moduleId: input.moduleId,
    title: input.title,
    resourceType: input.resourceType,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    contentBase64: input.contentBase64,
    linkUrl: input.linkUrl,
    createdAt
  };

  if (!isDbEnabled()) {
    const list = readJson<ModuleResource[]>(RESOURCE_FILE, []);
    list.push(next);
    writeJson(RESOURCE_FILE, list);
    return next;
  }

  const row = await queryOne<DbResource>(
    `INSERT INTO module_resources (id, module_id, title, resource_type, file_name, mime_type, size, content_base64, link_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      next.id,
      next.moduleId,
      next.title,
      next.resourceType,
      next.fileName ?? null,
      next.mimeType ?? null,
      next.size ?? null,
      next.contentBase64 ?? null,
      next.linkUrl ?? null,
      createdAt
    ]
  );

  return row ? mapResource(row) : next;
}

export async function deleteModuleResource(id: string) {
  if (!isDbEnabled()) {
    const list = readJson<ModuleResource[]>(RESOURCE_FILE, []);
    const filtered = list.filter((item) => item.id !== id);
    writeJson(RESOURCE_FILE, filtered);
    return true;
  }
  await query("DELETE FROM module_resources WHERE id = $1", [id]);
  return true;
}
