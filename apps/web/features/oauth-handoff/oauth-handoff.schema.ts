import { Effect, Schema } from "effect";

import { OAuthHandoffInvalidInput } from "./oauth-handoff.errors";

const OAuthHandoffExchangeQuerySchema = Schema.Struct({
  code: Schema.String,
});

export interface OAuthHandoffSessionTransferInitInput {
  targetOrigin: string;
  authState: string | null;
  next: string | null;
  authType: string | null;
  oid: string | null;
}

export interface OAuthHandoffExchangeInput {
  code: string;
}

export const decodeSessionTransferInitInput = (params: URLSearchParams) =>
  Effect.gen(function* () {
    const target = params.get("target")?.trim() || "";

    if (!target) {
      return yield* new OAuthHandoffInvalidInput({
        message: "target is required",
      });
    }

    return {
      targetOrigin: target,
      authState: params.get("authState")?.trim() || null,
      next: params.get("next")?.trim() || null,
      authType: params.get("type")?.trim() || null,
      oid: params.get("oid")?.trim() || null,
    } satisfies OAuthHandoffSessionTransferInitInput;
  });

export const decodeOAuthHandoffExchangeInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(
      OAuthHandoffExchangeQuerySchema,
    )(raw);
    const code = decoded.code.trim();

    if (!code) {
      return yield* new OAuthHandoffInvalidInput({
        message: "code is required",
      });
    }

    return {
      code,
    } satisfies OAuthHandoffExchangeInput;
  });
