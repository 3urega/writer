import type { Project } from "../domain/types";

export async function createProjectOnServer(
  project?: Project
): Promise<string> {
  const body = project
    ? JSON.stringify({ project })
    : undefined;
  const r = await fetch("/api/project", {
    method: "POST",
    body,
    headers: body
      ? { "Content-Type": "application/json" }
      : undefined,
  });
  const data = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!r.ok) {
    throw new Error(data.error ?? `Error ${r.status}`);
  }
  if (!data.id) {
    throw new Error("Respuesta sin id");
  }
  return data.id;
}

export async function fetchProjectFromServer(id: string): Promise<Project> {
  const r = await fetch(`/api/project/${id}`);
  const data = (await r.json().catch(() => ({}))) as {
    project?: Project;
    error?: string;
  };
  if (r.status === 404) {
    throw new Error("404: Proyecto no encontrado en el servidor");
  }
  if (!r.ok) {
    throw new Error(data.error ?? `Error ${r.status}`);
  }
  if (!data.project) {
    throw new Error("Respuesta inválida");
  }
  return data.project;
}

export async function putProjectToServer(
  id: string,
  project: Project
): Promise<void> {
  const r = await fetch(`/api/project/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });
  if (!r.ok) {
    const data = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Error ${r.status}`);
  }
}
