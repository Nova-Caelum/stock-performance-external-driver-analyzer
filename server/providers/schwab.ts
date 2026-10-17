// Schwab stand-in. Implements the provider interface so MARKET_PROVIDER=schwab type-checks and
// selects cleanly, but every call answers "not configured".
//
// The real implementation needs:
//   1. The Schwab Trader API price-history endpoint (market-data product), mapped onto Bar/BarsResult
//      with the same Range -> frequency table the Yahoo provider uses.
//   2. 3-legged OAuth: a registered Schwab developer app, the client secret stored in BWS (never in
//      this repo), and a one-time authorization-code login to obtain the first token pair.
//   3. Refresh-token renewal: access tokens are short-lived and refresh tokens expire on a fixed
//      schedule, so the provider must refresh before expiry and surface re-login when it cannot.
import {
  NotConfiguredError,
  type BarsResult,
  type MarketDataProvider,
  type Range,
  type StockSummary,
  type SymbolInfo,
} from "./types.js";

const NOT_CONFIGURED =
  "Schwab provider not configured: register a Schwab developer app, store the client secret in BWS, complete OAuth";

export const schwabProvider: MarketDataProvider = {
  id: "schwab",

  async getBars(_symbol: string, _range: Range): Promise<BarsResult> {
    throw new NotConfiguredError(NOT_CONFIGURED);
  },

  async resolveSymbol(_symbol: string): Promise<SymbolInfo | null> {
    throw new NotConfiguredError(NOT_CONFIGURED);
  },

  async getSummary(_symbol: string): Promise<StockSummary> {
    throw new NotConfiguredError(NOT_CONFIGURED);
  },
};
