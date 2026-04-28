export type KnowledgeDocumentDto = {
  id: string;
  title: string;
  sourceFilename: string;
  status: "pending" | "ready" | "error";
  errorMessage: string | null;
  activeForAgent: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchKnowledgeDocuments(
  projectId: string
): Promise<KnowledgeDocumentDto[]> {
  const r = await fetch(`/api/project/${projectId}/knowledge`);
  const data = (await r.json().catch(() => ({}))) as {
    documents?: KnowledgeDocumentDto[];
    error?: string;
  };
  if (!r.ok) {
    throw new Error(data.error ?? `Error ${r.status}`);
  }
  if (!data.documents) {
    throw new Error("Respuesta inválida");
  }
  return data.documents;
}

export async function uploadKnowledgePdf(
  projectId: string,
  file: File,
  title?: string
): Promise<KnowledgeDocumentDto> {
  const form = new FormData();
  form.set("file", file);
  if (title?.trim()) form.set("title", title.trim());
  const r = await fetch(`/api/project/${projectId}/knowledge`, {
    method: "POST",
    body: form,
  });
  const data = (await r.json().catch(() => ({}))) as {
    document?: KnowledgeDocumentDto;
    error?: string;
  };
  if (!r.ok && r.status !== 422) {
    throw new Error(data.error ?? `Error ${r.status}`);
  }
  if (!data.document) {
    throw new Error(data.error ?? "Respuesta inválida");
  }
  return data.document;
}

export async function patchKnowledgeDocument(
  projectId: string,
  documentId: string,
  body: { title?: string; activeForAgent?: boolean }
): Promise<KnowledgeDocumentDto> {
  const r = await fetch(
    `/api/project/${projectId}/knowledge/${documentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = (await r.json().catch(() => ({}))) as {
    document?: KnowledgeDocumentDto;
    error?: string;
  };
  if (!r.ok) {
    throw new Error(data.error ?? `Error ${r.status}`);
  }
  if (!data.document) {
    throw new Error("Respuesta inválida");
  }
  return data.document;
}
