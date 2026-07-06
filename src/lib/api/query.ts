// Pure query-string parsing for the public v1 API. No SvelteKit/DB imports so
// it can be unit-tested directly (see query.test.ts), following the
// quota-window precedent. Handlers consume this via the Response-producing
// wrappers in v1.ts, not directly.
//
// Conventions encoded here (and nowhere else):
// - Filter params validate strictly: a bad value is a 400 with a
//   "Bad request: ..." message naming the wire param.
// - Pagination params never error: limit/offset silently clamp to 1–200
//   (default 50) and ≥ 0 (default 0).
// - Wire names are snake_case; spec keys are the camelCase names the service
//   layer expects (`teamId` reads `team_id`). Override with `name` if they
//   ever diverge.
// - A missing required param reports *all* of the endpoint's required params
//   ("team_a and team_b are required"), matching the documented behaviour.
// - Empty string is treated as absent, except for optional string params,
//   which pass "" through to the service layer unchanged.

export interface ParseFailure {
  ok: false;
  status: number;
  message: string;
}

export interface ParseSuccess<T> {
  ok: true;
  value: T;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export interface ParamSpec<T> {
  /** Wire name override; defaults to snake_case of the spec key. */
  name?: string;
  required: boolean;
  /** Custom "is required" message (used by enum to list valid values). */
  requiredMessage?: (wire: string) => string;
  /** "" means absent (true for everything except string, which passes "" through). */
  emptyIsAbsent: boolean;
  /** Parse a present, non-empty raw value. */
  parse: (raw: string, wire: string) => ParseResult<T>;
}

export type SpecMap = Record<string, ParamSpec<unknown>>;

export type Values<S extends SpecMap> = {
  [K in keyof S]: S[K] extends ParamSpec<infer T> ? T : never;
};

function fail(message: string, status = 400): ParseFailure {
  return { ok: false, status, message };
}

/** teamId -> team_id, dateFrom -> date_from. */
export function wireName(key: string, override?: string): string {
  return override ?? key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

interface CommonOpts {
  name?: string;
}

interface IntOpts extends CommonOpts {
  /** Lower bound, inclusive. 1 (default) reads "positive", 0 "non-negative". */
  min?: number;
}

function int(opts: IntOpts & { required: true }): ParamSpec<number>;
function int(opts?: IntOpts & { required?: false }): ParamSpec<number | undefined>;
function int(opts: IntOpts & { required?: boolean } = {}): ParamSpec<number | undefined> {
  const min = opts.min ?? 1;
  return {
    name: opts.name,
    required: opts.required ?? false,
    emptyIsAbsent: true,
    parse: (raw, wire) => {
      const value = parseInt(raw, 10);
      if (isNaN(value) || value < min) {
        const kind = min === 0 ? "non-negative" : "positive";
        return fail(`Bad request: ${wire} must be a ${kind} integer`);
      }
      return { ok: true, value };
    },
  };
}

function str(opts: CommonOpts & { required: true }): ParamSpec<string>;
function str(opts?: CommonOpts & { required?: false }): ParamSpec<string | undefined>;
function str(opts: CommonOpts & { required?: boolean } = {}): ParamSpec<string | undefined> {
  return {
    name: opts.name,
    required: opts.required ?? false,
    emptyIsAbsent: false,
    parse: (raw) => ({ ok: true, value: raw }),
  };
}

function enumOf<T extends string>(
  values: readonly T[],
  opts: CommonOpts & { required: true },
): ParamSpec<T>;
function enumOf<T extends string>(
  values: readonly T[],
  opts?: CommonOpts & { required?: false },
): ParamSpec<T | undefined>;
function enumOf<T extends string>(
  values: readonly T[],
  opts: CommonOpts & { required?: boolean } = {},
): ParamSpec<T | undefined> {
  return {
    name: opts.name,
    required: opts.required ?? false,
    emptyIsAbsent: true,
    requiredMessage: (wire) =>
      `Bad request: ${wire} is required. Valid values: ${values.join(", ")}`,
    parse: (raw, wire) =>
      (values as readonly string[]).includes(raw)
        ? { ok: true, value: raw as T }
        : fail(`Bad request: invalid ${wire} '${raw}'. Valid values: ${values.join(", ")}`),
  };
}

/** Sort direction: 'asc' | 'desc', anything else is a 400. */
function order(opts: CommonOpts = {}): ParamSpec<"asc" | "desc" | undefined> {
  return {
    name: opts.name,
    required: false,
    emptyIsAbsent: true,
    parse: (raw, wire) =>
      raw === "asc" || raw === "desc"
        ? { ok: true, value: raw }
        : fail(`Bad request: ${wire} must be 'asc' or 'desc'`),
  };
}

/** Lenient boolean: 'true' -> true, 'false' -> false, anything else -> undefined. */
function bool(opts: CommonOpts = {}): ParamSpec<boolean | undefined> {
  return {
    name: opts.name,
    required: false,
    emptyIsAbsent: true,
    parse: (raw) => ({
      ok: true,
      value: raw === "true" ? true : raw === "false" ? false : undefined,
    }),
  };
}

/** Param spec constructors for `parseQuery`. */
export const q = { int, string: str, enum: enumOf, order, bool };

/**
 * Validate and coerce an endpoint's query params against a spec. Params are
 * checked in spec order and the first failure wins, except that missing
 * required params are reported before any value errors.
 */
export function parseQueryParams<S extends SpecMap>(
  params: URLSearchParams,
  spec: S,
): ParseResult<Values<S>> {
  const requiredWires: string[] = [];
  let anyMissing = false;
  let onlyRequired: ParamSpec<unknown> | undefined;

  for (const key in spec) {
    const s = spec[key];
    if (!s.required) continue;
    const wire = wireName(key, s.name);
    requiredWires.push(wire);
    onlyRequired = s;
    const raw = params.get(wire);
    if (raw === null || raw === "") anyMissing = true;
  }

  if (anyMissing) {
    if (requiredWires.length === 1) {
      const wire = requiredWires[0];
      return fail(
        onlyRequired?.requiredMessage?.(wire) ?? `Bad request: ${wire} is required`,
      );
    }
    return fail(`Bad request: ${requiredWires.join(" and ")} are required`);
  }

  const values: Record<string, unknown> = {};
  for (const key in spec) {
    const s = spec[key];
    const wire = wireName(key, s.name);
    const raw = params.get(wire);
    if (raw === null || (raw === "" && s.emptyIsAbsent)) {
      values[key] = undefined;
      continue;
    }
    const result = s.parse(raw, wire);
    if (!result.ok) return result;
    values[key] = result.value;
  }
  return { ok: true, value: values as Values<S> };
}

export interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Clamp limit to 1–200 (default 50) and offset to ≥ 0 (default 0). Never
 * errors: non-numeric or out-of-range input falls back or clamps.
 */
export function parsePagination(params: URLSearchParams): Pagination {
  const limit = Math.min(
    Math.max(parseInt(params.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const offset = Math.max(parseInt(params.get("offset") ?? "0", 10) || 0, 0);
  return { limit, offset };
}

/** Parse a numeric path param (`/matches/[id]`): positive integer or a 400. */
export function parseIdParam(raw: string): ParseResult<number> {
  const id = parseInt(raw, 10);
  if (isNaN(id) || id < 1) {
    return fail("Bad request: id must be a positive integer");
  }
  return { ok: true, value: id };
}
