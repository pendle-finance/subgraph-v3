import { Address, ethereum } from "@graphprotocol/graph-ts";
import { SwapEventYT } from "../../generated/PendleWrapper/PendleWrapper";
import { Pair } from "../../generated/schema";
import { loadPendleData, loadToken } from "../utils/load-entity";
import { handleSwapInfo } from "./market/marketEventRouter";

export function handleSwapEventYT(event: SwapEventYT): void {
  let inToken = loadToken(event.params.inToken);
  let outToken = loadToken(event.params.outToken);

  let pair: Pair | null = null;
  let inTokenMarkets = inToken.markets;
  for (let i = 0; i < inTokenMarkets.length; ++i) {
    let currentPair = Pair.load(inTokenMarkets[i]);
    if (
      currentPair.token0 == outToken.id ||
      currentPair.token1 == outToken.id
    ) {
      pair = currentPair;
    }
  }

  // swap starts here
  handleSwapInfo(
    Address.fromHexString(pair.id) as Address,
    event.params.inToken,
    event.params.outToken,
    event.params.inAmount,
    event.params.outAmount,
    event.params.user,
    event
  );
}
