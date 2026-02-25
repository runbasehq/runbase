import { Effect, Schema } from "effect";

import { OAuthHandoffInvalidInput } from "./oauth-handoff.errors";

const OAuthHandoffStartBodySchema = Schema.Struct({
  returnTo: Schema.String,
  openerOrigin: Schema.optional(Schema.NullOr(Schema.String)),
  authState: Schema.optional(Schema.NullOr(Schema.String)),
  type: Schema.optional(Schema.NullOr(Schema.String)),
  oid: Schema.optional(Schema.NullOr(Schema.String)),
});

const OAuthHandoffExchangeQuerySchema = Schema.Struct({
  code: Schema.String,
});

export interface OAuthHandoffStartInput {
  returnTo: string;
  openerOrigin: string | null;
  authState: string | null;
  authType: string | null;
  oid: string | null;
}

export interface OAuthHandoffExchangeInput {
  code: string;
}

function normalizeOptionalString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export const decodeOAuthHandoffStartInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(OAuthHandoffStartBodySchema)(
      raw,
    );
    const returnTo = decoded.returnTo.trim();

    if (!returnTo) {
      return yield* new OAuthHandoffInvalidInput({
        message: "returnTo is required",
      });
    }

    return {
      returnTo,
      openerOrigin: normalizeOptionalString(decoded.openerOrigin),
      authState: normalizeOptionalString(decoded.authState),
      authType: normalizeOptionalString(decoded.type),
      oid: normalizeOptionalString(decoded.oid),
    } satisfies OAuthHandoffStartInput;
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
