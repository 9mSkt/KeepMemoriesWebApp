import "server-only";
import { isSupabaseConfigured, useDevDb } from "../env";
import { createDevStore } from "./devStore";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

let store: Store | undefined;

export function db(): Store {
  if (store) return store;
  if (isSupabaseConfigured) store = createSupabaseStore();
  else if (useDevDb) store = createDevStore();
  else throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return store;
}

export type * from "./types";
