import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchInstruments } from "./search.server";

export const searchSymbols = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ query: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    try {
      return { results: await searchInstruments(data.query) };
    } catch (e) {
      console.error("[search] failed", e);
      return { results: [] };
    }
  });
