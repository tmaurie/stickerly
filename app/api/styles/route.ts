import { UserFacingError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { createStyle, getLibrary, updateLibrary } from "@/lib/storage";
import { findStyle } from "@/lib/types";

export const GET = handle(async () => Response.json(await getLibrary()));

/** Creates a Style, or duplicates `from` — which copies its reference folder too. */
export const POST = handle(async (request: Request) => {
  const body = (await request.json()) as { name?: string; from?: string };
  const name = body.name?.trim();
  if (!name) throw new UserFacingError("Donne un nom au style.");
  return Response.json(await createStyle(name, body.from), { status: 201 });
});

/** The only library-level setting left: which Style a new Album receives. */
export const PUT = handle(async (request: Request) => {
  const body = (await request.json()) as { defaultStyleId?: string };
  const library = await updateLibrary((lib) => {
    if (body.defaultStyleId) {
      if (!findStyle(lib, body.defaultStyleId)) throw new UserFacingError("Style inconnu.");
      lib.defaultStyleId = body.defaultStyleId;
    }
    return lib;
  });
  return Response.json(library);
});
