import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupQuotes } from "./quotes.server";

export const getQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ symbols: z.array(z.string().min(1)).min(1).max(50) }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const prices = await lookupQuotes(data.symbols);
      if (Object.keys(prices).length === 0) {
        return { prices: {}, error: "No live prices found for these symbols" };
      }
      return { prices };
    } catch (e) {
      console.error("[quotes] lookup failed", e);
      return { prices: {}, error: "Market data provider unreachable" };
    }
  });
