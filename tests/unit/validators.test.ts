// lib/action.ts: todo lo que llega del navegador es no confiable. Los validadores son la primera barrera.
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
const { changed, check, UserError, v } = await import("@/lib/action");

const bad = (fn: () => unknown) => expect(fn).toThrow(UserError);

describe("v.uuid", () => {
  it("acepta uuid", () => expect(v.uuid("A0000000-0000-4000-8000-000000000001")).toBeTruthy());
  it.each(["", "1", "../etc", "a0000000-0000-4000-8000-00000000000g", "a0000000-0000-4000-8000-000000000001' or 1=1", null, 42, {}])("rechaza %s", (x) => bad(() => v.uuid(x)));
  it("optUuid: vacío → null", () => {
    expect(v.optUuid("")).toBeNull();
    expect(v.optUuid(null)).toBeNull();
    bad(() => v.optUuid("x"));
  });
});

describe("v.oneOf", () => {
  it("solo valores de la lista, sin coerción", () => {
    expect(v.oneOf("Venta", ["Venta", "Alquiler"], "Op")).toBe("Venta");
    bad(() => v.oneOf("venta", ["Venta"], "Op"));
    bad(() => v.oneOf(["Venta"], ["Venta"], "Op"));
    bad(() => v.oneOf("toString", ["Venta"], "Op"));
  });
});

describe("v.text", () => {
  it("recorta espacios y exige obligatorio", () => {
    expect(v.text("  hola  ", "X", 10)).toBe("hola");
    bad(() => v.text("   ", "X", 10, true));
    expect(v.text(undefined, "X", 10)).toBe("");
    expect(v.text(123, "X", 10)).toBe("");
  });
  it("respeta el máximo", () => bad(() => v.text("x".repeat(11), "X", 10)));
});

describe("v.num", () => {
  it("rango, enteros y vacíos", () => {
    expect(v.num("5", "N", 0, 10)).toBe(5);
    expect(v.num("", "N", 0, 10)).toBeNull();
    expect(v.num(null, "N", 0, 10)).toBeNull();
    expect(v.num(2.5, "N", 0, 10, false)).toBe(2.5);
  });
  it.each([[-1], [11], [2.5], ["abc"], [Infinity], [NaN], ["1e400"]])("rechaza %s", (x) => bad(() => v.num(x, "N", 0, 10)));
});

describe("v.bool", () => {
  it("solo true es true (no 'true' ni 1)", () => {
    expect(v.bool(true)).toBe(true);
    expect(v.bool("true")).toBe(false);
    expect(v.bool(1)).toBe(false);
  });
});

describe("v.list", () => {
  it("valida cada elemento, quita duplicados y limita el tamaño", () => {
    expect(v.list(["a", "a", "b"], 5, (x) => String(x))).toEqual(["a", "b"]);
    expect(v.list(null, 5, String)).toEqual([]);
    bad(() => v.list("a,b", 5, String));
    bad(() => v.list([1, 2, 3], 2, String));
  });
});

describe("v.email", () => {
  it("normaliza a minúsculas", () => expect(v.email(" Ana@Correo.TEST ")).toBe("ana@correo.test"));
  it.each(["ana", "ana@", "@x.com", "a b@x.com", "a@x"])("rechaza %s", (x) => bad(() => v.email(x)));
  it("vacío permitido salvo obligatorio", () => {
    expect(v.email("")).toBe("");
    bad(() => v.email("", true));
  });
});

describe("v.phone", () => {
  it.each([["8888-7777", "88887777"], ["+506 2222 3333", "22223333"], ["50688887777", "88887777"]])("%s → %s", (x, out) => expect(v.phone(x)).toBe(out));
  it.each(["1234", "12345678", "999999999"])("rechaza %s", (x) => bad(() => v.phone(x)));
  it("vacío permitido salvo obligatorio", () => {
    expect(v.phone("")).toBe("");
    bad(() => v.phone("", true));
  });
});

describe("fecha y hora", () => {
  it("v.date", () => {
    expect(v.date("2026-12-31")).toBe("2026-12-31");
    bad(() => v.date("2026-13-45"));
    bad(() => v.date("31/12/2026"));
    bad(() => v.date("2026-12-31T00:00"));
  });
  it("v.time", () => {
    expect(v.time("08:30")).toBe("08:30");
    bad(() => v.time("24:00"));
    bad(() => v.time("8:30"));
    bad(() => v.time("08:30:00"));
  });
});

describe("v.httpsUrl", () => {
  it("acepta https", () => expect(v.httpsUrl("https://images.unsplash.com/x.jpg")).toBe("https://images.unsplash.com/x.jpg"));
  it.each(["http://x.com/a.jpg", "javascript:alert(1)", "data:image/png;base64,AAAA", "file:///etc/passwd", "//x.com/a.jpg", "no es url", ""])("rechaza %s", (x) => bad(() => v.httpsUrl(x)));
  it("limita a 2000 caracteres", () => bad(() => v.httpsUrl("https://x.com/" + "a".repeat(2000))));
});

describe("check y changed", () => {
  it("check lanza el error de la base", () => {
    expect(() => check({ data: null, error: { code: "42501", message: "denied" } })).toThrow();
    expect(check({ data: 1, error: null })).toBe(1);
  });
  it("changed exige al menos una fila (la RLS no da error al bloquear)", () => {
    expect(() => changed({ data: [], error: null })).toThrow(/no tienes permiso/);
    expect(() => changed({ data: null, error: null })).toThrow(UserError);
    expect(changed({ data: [{ id: 1 }], error: null })).toHaveLength(1);
  });
});
