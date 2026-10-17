import { schwabProvider } from "./schwab.js";
import type { MarketDataProvider } from "./types.js";
import { yahooProvider } from "./yahoo.js";

const PROVIDERS: Record<string, MarketDataProvider> = {
  yahoo: yahooProvider,
  schwab: schwabProvider,
};

/** The provider named by MARKET_PROVIDER ("yahoo" by default). Throws on an unknown name. */
export function getProvider(marketProvider: string | undefined): MarketDataProvider {
  const name = (marketProvider ?? "yahoo").trim() || "yahoo";
  if (!Object.hasOwn(PROVIDERS, name)) {
    throw new Error(`Unknown MARKET_PROVIDER "${name}". Use "yahoo" or "schwab".`);
  }
  return PROVIDERS[name];
}
