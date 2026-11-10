// Ubicación del editor: coordenadas pegadas, mapeo de OpenStreetMap, normalización de nombres,
// sugerencias por país y búsqueda / geocodificación inversa (Server Actions).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyPlace, canonical, fieldsFromOsm, parseCoords, placeDiff, type PlaceFields } from "@/lib/geo";
import { knownPlaces, placesFor } from "@/lib/format";
import { AGENT, fakeSupabase } from "./helpers";

const state = vi.hoisted(() => ({ session: { supabase: null as unknown, userId: null as string | null, me: null as unknown } }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
vi.mock("next/cache", () => ({ refresh }));

const { searchPlaces, reversePlace } = await import("@/app/actions/geocode");

describe("parseCoords", () => {
  it.each([
    ["9.8385, -83.866", 9.8385, -83.866],
    ["9.8385 -83.866", 9.8385, -83.866],
    ["  9.8385;-83.866 ", 9.8385, -83.866],
    ["https://www.google.com/maps/@9.8385,-83.866,17z", 9.8385, -83.866],
    ["https://www.google.com/maps/place/X/@9.80,-83.80,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d9.8385123!4d-83.8660456", 9.838512, -83.866046],
    ["https://maps.google.com/?q=9.8385,-83.866", 9.8385, -83.866],
    ["https://www.google.com/maps/search/?api=1&query=9.8385%2C-83.866", 9.8385, -83.866],
    ["https://www.openstreetmap.org/?mlat=9.8385&mlon=-83.866#map=17/9.8385/-83.866", 9.8385, -83.866],
    ["https://www.openstreetmap.org/#map=17/9.8385/-83.866", 9.8385, -83.866],
    ["https://waze.com/ul?ll=9.8385,-83.866&navigate=yes", 9.8385, -83.866],
  ])("%s", (text, lat, lng) => {
    expect(parseCoords(text)).toEqual({ lat, lng });
  });

  it.each(["Santa Lucía, Paraíso", "", "200 m sur de la iglesia", "95, -83", "9.8, -190", "0, 0", "https://maps.app.goo.gl/abc123"])("no es coordenada: %s", (text) => {
    expect(parseCoords(text)).toBeNull();
  });
});

describe("fieldsFromOsm", () => {
  it("Costa Rica: provincia, cantón (county) y distrito o barrio", () => {
    expect(fieldsFromOsm({ village: "Llanos de Santa Lucía", county: "Paraíso", province: "Cartago", country: "Costa Rica", country_code: "cr", postcode: "30205" }))
      .toEqual({ country: "Costa Rica", province: "Cartago", canton: "Paraíso", zone: "Llanos de Santa Lucía" });
  });

  it("no repite la ciudad como barrio y toma la calle", () => {
    expect(fieldsFromOsm({ road: "Avenida 2", neighbourhood: "Los Solares", town: "Paraíso", county: "Paraíso", province: "Cartago", country: "Costa Rica", country_code: "cr" }))
      .toEqual({ country: "Costa Rica", province: "Cartago", canton: "Paraíso", zone: "Los Solares", address: "Avenida 2" });
    expect(fieldsFromOsm({ town: "Paraíso", county: "Paraíso", country_code: "cr", country: "Costa Rica" }).zone).toBeUndefined();
  });

  it("otros países: la ciudad va antes que el condado", () => {
    expect(fieldsFromOsm({ suburb: "Brickell", city: "Miami", county: "Miami-Dade County", state: "Florida", country: "Estados Unidos de América", country_code: "us" }))
      .toEqual({ country: "Estados Unidos", province: "Florida", canton: "Miami", zone: "Brickell" });
  });

  it("quita prefijos administrativos", () => {
    expect(fieldsFromOsm({ county: "Cantón de Paraíso", province: "Provincia Cartago", country_code: "cr" })).toEqual({ canton: "Paraíso", province: "Cartago" });
  });
});

describe("canonical / applyPlace / placeDiff", () => {
  const known = { countries: ["Costa Rica", "Panamá"], provinces: ["Cartago", "San José"], cantons: ["Paraíso", "La Unión"] };
  const base: PlaceFields = { country: "Costa Rica", province: "Cartago", canton: "Paraíso", zone: "Centro", address: "" };

  it("usa la forma ya conocida sin importar mayúsculas ni tildes", () => {
    expect(canonical("  paraiso ", known.cantons)).toBe("Paraíso");
    expect(canonical("la   union", known.cantons)).toBe("La Unión");
    expect(canonical("Boquete", known.cantons)).toBe("Boquete");
  });

  it("aplica los campos encontrados; la calle solo rellena una dirección vacía", () => {
    expect(applyPlace(base, { canton: "la union", zone: "Tres Ríos", address: "Calle 1" }, known)).toEqual({ ...base, canton: "La Unión", zone: "Tres Ríos", address: "Calle 1" });
    expect(applyPlace({ ...base, address: "Portón negro" }, { address: "Calle 1" }, known).address).toBe("Portón negro");
  });

  it("al cambiar de país sin provincia nueva, borra la provincia anterior", () => {
    expect(applyPlace(base, { country: "Panamá", canton: "Boquete" }, known)).toEqual({ ...base, country: "Panamá", province: "", canton: "Boquete" });
  });

  it("los campos vacíos del resultado no borran nada", () => {
    expect(applyPlace(base, {}, known)).toEqual(base);
  });

  it("placeDiff solo lista lo que cambiaría", () => {
    expect(placeDiff(base, { country: "costa rica", canton: "Paraíso", zone: "Santa Lucía" }, known)).toEqual(["zone"]);
  });
});

describe("placesFor", () => {
  const places = knownPlaces([
    { country: "Costa Rica", province: "San José", canton: "Escazú" },
    { country: "Panamá", province: "Chiriquí", canton: "Boquete" },
    { country: "Estados Unidos", province: "Florida", canton: "Miami" },
  ]);

  it("Costa Rica: sus provincias (las 7) y cantones; nada de otros países", () => {
    const cr = placesFor(places, "costa rica");
    expect(cr.provinces).toEqual(expect.arrayContaining(["Cartago", "San José", "Limón"]));
    expect(cr.provinces).not.toContain("Florida");
    expect(cr.cantons).toEqual(expect.arrayContaining(["Escazú", "Paraíso"]));
    expect(cr.cantons).not.toContain("Boquete");
  });

  it("con provincia, los cantones de esa provincia", () => {
    expect(placesFor(places, "Costa Rica", "San José").cantons).toEqual(["Escazú"]);
    expect(placesFor(places, "Costa Rica", "Cartago").cantons).toContain("Paraíso");
  });

  it("otro país: solo lo del inventario allí", () => {
    expect(placesFor(places, "Panamá")).toEqual({ provinces: ["Chiriquí"], cantons: ["Boquete"] });
  });

  it("sin país: todas", () => {
    expect(placesFor(places, " ").cantons).toEqual(places.cantons);
  });
});

/* --------------------------------------------------------------- Server Actions */

const osmPlace = { lat: "9.8382595", lon: "-83.8805569", name: "Llanos de Santa Lucía", display_name: "Llanos de Santa Lucía, Paraíso, Cartago, 30205, Costa Rica", address: { village: "Llanos de Santa Lucía", county: "Paraíso", province: "Cartago", country: "Costa Rica", country_code: "cr" } };
const fetchOk = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("searchPlaces / reversePlace", () => {
  beforeEach(() => {
    state.session = { supabase: fakeSupabase().client, userId: "u", me: AGENT };
    refresh.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("exige sesión y no consulta afuera sin ella", async () => {
    const fetchMock = fetchOk([]);
    vi.stubGlobal("fetch", fetchMock);
    state.session = { supabase: null, userId: null, me: null };
    expect((await searchPlaces("Paraíso")).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("busca en Nominatim con User-Agent propio y traduce los resultados; no refresca la pantalla", async () => {
    const fetchMock = fetchOk([osmPlace]);
    vi.stubGlobal("fetch", fetchMock);
    const res = await searchPlaces("Santa Lucía, Paraíso");
    expect(res).toEqual({ ok: true, data: [{ lat: 9.83826, lng: -83.880557, name: "Llanos de Santa Lucía", label: "Llanos de Santa Lucía, Paraíso, Cartago, Costa Rica", fields: { country: "Costa Rica", province: "Cartago", canton: "Paraíso", zone: "Llanos de Santa Lucía" } }] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(url.searchParams.get("q")).toBe("Santa Lucía, Paraíso");
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^RealStatePanel\//);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("valida la búsqueda antes de salir a la red", async () => {
    const fetchMock = fetchOk([]);
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchPlaces("ab")).toEqual({ ok: false, error: "Escribe al menos 3 letras." });
    expect((await searchPlaces("x".repeat(201))).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("errores del servicio llegan como mensaje claro", async () => {
    vi.stubGlobal("fetch", fetchOk({}, 429));
    expect(await searchPlaces("Paraíso")).toEqual({ ok: false, error: "Demasiadas búsquedas seguidas. Espera unos segundos." });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout"); }));
    expect((await searchPlaces("Paraíso")).ok).toBe(false);
  });

  it("reversePlace devuelve el lugar con el punto del marcador", async () => {
    vi.stubGlobal("fetch", fetchOk(osmPlace));
    const res = await reversePlace(9.84, -83.88);
    expect(res.ok && res.data).toMatchObject({ lat: 9.84, lng: -83.88, fields: { canton: "Paraíso" } });
  });

  it("reversePlace: sin lugar (mar abierto) devuelve null; coordenadas fuera de rango se rechazan", async () => {
    vi.stubGlobal("fetch", fetchOk({ error: "Unable to geocode" }));
    expect(await reversePlace(5, -90)).toEqual({ ok: true, data: null });
    expect((await reversePlace(120, 0)).ok).toBe(false);
  });
});
