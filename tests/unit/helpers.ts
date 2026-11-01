// Usuarios del seed y un cliente de Supabase falso que registra cada llamada.
import { vi } from "vitest";
import type { TeamUser } from "@/lib/types";

const member = (id: string, name: string, role: TeamUser["role"]): TeamUser => ({
  id, name, firstName: name.split(" ")[0], initials: "XX", email: `${name.split(" ")[0].toLowerCase()}@isf.test`, role,
  phone: "88001100", specialty: "", zones: "", bio: "", photoUrl: null, active: true,
  isOwner: false, contactHours: "", contactLocation: "",
});

export const ADMIN = member("a0000000-0000-4000-8000-000000000001", "Mariana Solano", "Admin");
export const AGENT = member("a0000000-0000-4000-8000-000000000002", "Carlos Méndez", "Asesor");
export const OTHER_AGENT_ID = "a0000000-0000-4000-8000-000000000003";

type DbError = { code?: string; message: string };
type Res = { data: unknown; error: DbError | null };

export interface Call {
  kind: "rpc" | "table";
  name: string;
  op?: "select" | "insert" | "update" | "delete";
  payload?: unknown;
  filters: [string, unknown][];
}

/**
 * Cliente falso con la forma que usan las acciones: from(...).insert/update/delete().eq().select(),
 * rpc(), functions.invoke() y auth.*. `respond` decide la respuesta de cada llamada.
 */
export function fakeSupabase(respond: (c: Call) => Res = () => ({ data: [{ id: "x", code: "ISF-0099" }], error: null })) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { kind: "table", name: table, op: "select", filters: [] };
    calls.push(call);
    const chain = {
      select: () => chain,
      insert: (p: unknown) => ((call.op = "insert"), (call.payload = p), chain),
      update: (p: unknown) => ((call.op = "update"), (call.payload = p), chain),
      delete: () => ((call.op = "delete"), chain),
      eq: (col: string, val: unknown) => (call.filters.push([col, val]), chain),
      order: () => chain,
      limit: () => chain,
      single: () => chain,
      maybeSingle: () => chain,
      then: (ok: (r: Res) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(respond(call)).then(ok, ko),
    };
    return chain;
  };
  const client = {
    from: vi.fn(from),
    rpc: vi.fn(async (name: string, payload?: unknown) => {
      const call: Call = { kind: "rpc", name, payload, filters: [] };
      calls.push(call);
      return respond(call);
    }),
    functions: { invoke: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { agent_id: "a0000000-0000-4000-8000-0000000000ff" }, error: null })) },
    auth: {
      signInWithPassword: vi.fn(async (): Promise<{ error: { status?: number; code?: string; message: string } | null }> => ({ error: null })),
      updateUser: vi.fn(async (): Promise<{ error: { code?: string; message: string } | null }> => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async (): Promise<{ error: { status?: number; message: string } | null }> => ({ error: null })),
    },
  };
  return { client, calls, rpcCall: (name: string) => calls.find((c) => c.kind === "rpc" && c.name === name) };
}
