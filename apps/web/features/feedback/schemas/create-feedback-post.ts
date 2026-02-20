export interface CreateFeedbackPostInput {
  title: string;
  content: string;
  boardId?: string;
}

export interface ParsedCreateFeedbackPostInput {
  title: string;
  content: string;
  boardId: string | null;
}

interface ParseResult {
  data?: ParsedCreateFeedbackPostInput;
  error?: string;
}

const TITLE_MAX_LENGTH = 140;
const CONTENT_MAX_LENGTH = 5000;

export function parseCreateFeedbackPostInput(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object") {
    return { error: "Invalid request body" };
  }

  const source = raw as Record<string, unknown>;
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const content =
    typeof source.content === "string" ? source.content.trim() : "";
  const boardId =
    typeof source.boardId === "string" && source.boardId.trim().length
      ? source.boardId.trim()
      : null;

  if (!title) {
    return { error: "Title is required" };
  }

  if (title.length > TITLE_MAX_LENGTH) {
    return { error: `Title must be ${TITLE_MAX_LENGTH} characters or less` };
  }

  if (!content) {
    return { error: "Description is required" };
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    return {
      error: `Description must be ${CONTENT_MAX_LENGTH} characters or less`,
    };
  }

  return {
    data: {
      title,
      content,
      boardId,
    },
  };
}
