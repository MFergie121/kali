import { json } from "@sveltejs/kit";
import {
  parseIdParam,
  parsePagination,
  parseQueryParams,
  q,
  type Pagination,
  type ParseFailure,
  type SpecMap,
  type Values,
} from "./query";

// Everything a v1 handler needs besides the API-key gate and its service
// call: query parsing (rules live in query.ts) adapted to the Response
// short-circuit idiom, plus the standard response shapes. Handler pattern:
//
//   const denied = await requireApiKey(request, locals);
//   if (denied) return denied;
//   const query = parseListQuery(url, { year: q.int(), teamId: q.string() });
//   if (query instanceof Response) return query;
//   return listResponse(await getThingsPaginated(query), query);

export { q, parsePagination, type Pagination };

function deny(failure: ParseFailure): Response {
  return json({ error: failure.message }, { status: failure.status });
}

/** Parse query params against a spec; a validation failure is the 400 Response. */
export function parseQuery<S extends SpecMap>(url: URL, spec: S): Values<S> | Response {
  const result = parseQueryParams(url.searchParams, spec);
  return result.ok ? result.value : deny(result);
}

/** `parseQuery` plus the standard limit/offset pagination params. */
export function parseListQuery<S extends SpecMap>(
  url: URL,
  spec: S,
): (Values<S> & Pagination) | Response {
  const result = parseQueryParams(url.searchParams, spec);
  if (!result.ok) return deny(result);
  return { ...result.value, ...parsePagination(url.searchParams) };
}

/** Parse a numeric `[id]` path param; a bad id is the 400 Response. */
export function parseId(raw: string): number | Response {
  const result = parseIdParam(raw);
  return result.ok ? result.value : deny(result);
}

/** The standard paginated list shape: `{ data, meta: { limit, offset, count, total } }`. */
export function listResponse<T>(
  result: { data: T[]; total: number },
  { limit, offset }: Pagination,
): Response {
  return json({
    data: result.data,
    meta: { limit, offset, count: result.data.length, total: result.total },
  });
}

/** A single resource: `{ data }`, or `{ error: "<label> not found" }` 404. */
export function resource<T>(item: T | null | undefined, label: string): Response {
  if (!item) {
    return json({ error: `${label} not found` }, { status: 404 });
  }
  return json({ data: item });
}
