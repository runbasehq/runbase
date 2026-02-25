import "server-only";

import { Axiom } from "@axiomhq/js";

type LogFields = Record<string, unknown>;

type LogEvent = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source: string;
  timestamp: string;
} & LogFields;

export interface AxiomLogger {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  with: (fields: LogFields) => AxiomLogger;
  flush: () => Promise<void>;
}

const token = process.env.AXIOM_TOKEN;
const dataset = process.env.AXIOM_DATASET;
const axiom = token ? new Axiom({ token }) : null;

function createEvent(
  level: LogEvent["level"],
  source: string,
  message: string,
  fields: LogFields,
) {
  return {
    level,
    source,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  } satisfies LogEvent;
}

export function createAxiomLogger(
  source: string,
  baseFields: LogFields = {},
): AxiomLogger {
  const events: LogEvent[] = [];

  const buildLogger = (scopeFields: LogFields): AxiomLogger => {
    const emit = (
      level: LogEvent["level"],
      message: string,
      fields: LogFields = {},
    ) => {
      events.push(
        createEvent(level, source, message, { ...scopeFields, ...fields }),
      );
    };

    return {
      debug: (message, fields) => emit("debug", message, fields),
      info: (message, fields) => emit("info", message, fields),
      warn: (message, fields) => emit("warn", message, fields),
      error: (message, fields) => emit("error", message, fields),
      with: (fields) => buildLogger({ ...scopeFields, ...fields }),
      flush: async () => {
        if (!events.length) {
          return;
        }

        if (!axiom || !dataset) {
          events.length = 0;
          return;
        }

        const batch = events.splice(0, events.length);

        try {
          await axiom.ingest(dataset, batch);
          await axiom.flush();
        } catch (error) {
          console.error("[axiom] failed to ingest logs", {
            source,
            count: batch.length,
            error,
          });
        }
      },
    };
  };

  return buildLogger(baseFields);
}
