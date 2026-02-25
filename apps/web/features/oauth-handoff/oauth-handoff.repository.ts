import "server-only";

import { Effect } from "effect";

import { getRedis } from "@/lib/redis";

import {
  OAuthHandoffCodeNotFound,
  OAuthHandoffPersistenceError,
} from "./oauth-handoff.errors";

const HANDOFF_KEY_PREFIX = "oauth_handoff:";

export interface OAuthHandoffPayload {
  targetOrigin: string;
  returnTo: string;
  openerOrigin: string | null;
  authState: string | null;
  authType: string | null;
  oid: string | null;
  sessionCookieName: string;
  sessionCookieValue: string;
  dontRememberCookieName: string | null;
  dontRememberCookieValue: string | null;
}

const toPersistenceError = (operation: string) =>
  new OAuthHandoffPersistenceError({ operation });

const fromRedisPromise = <A>(operation: string, thunk: () => Promise<A>) =>
  Effect.tryPromise({
    try: thunk,
    catch: () => toPersistenceError(operation),
  });

function toKey(code: string) {
  return `${HANDOFF_KEY_PREFIX}${code}`;
}

export class OAuthHandoffRepository extends Effect.Service<OAuthHandoffRepository>()(
  "OAuthHandoffRepository",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const createCode = Effect.fn("OAuthHandoffRepository.createCode")(
        ({
          payload,
          ttlSeconds,
        }: {
          payload: OAuthHandoffPayload;
          ttlSeconds: number;
        }) =>
          Effect.gen(function* () {
            const code = crypto.randomUUID();

            yield* fromRedisPromise("oauthHandoff.createCode", async () => {
              await getRedis().set(toKey(code), JSON.stringify(payload), {
                ex: ttlSeconds,
              });
            });

            return code;
          }),
      );

      const consumeCode = Effect.fn("OAuthHandoffRepository.consumeCode")(
        ({ code }: { code: string }) =>
          Effect.gen(function* () {
            const key = toKey(code);
            const stored = yield* fromRedisPromise(
              "oauthHandoff.consumeCode.get",
              async () => {
                return getRedis().get<string>(key);
              },
            );

            yield* fromRedisPromise(
              "oauthHandoff.consumeCode.del",
              async () => {
                await getRedis().del(key);
              },
            );

            if (!stored) {
              return yield* new OAuthHandoffCodeNotFound({});
            }

            try {
              return JSON.parse(stored) as OAuthHandoffPayload;
            } catch {
              return yield* toPersistenceError(
                "oauthHandoff.consumeCode.parse",
              );
            }
          }),
      );

      return {
        createCode,
        consumeCode,
      };
    }),
  },
) {}
