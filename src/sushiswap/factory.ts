import { Address, log } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { PairCreated as SushiswapPairCreatedEvent } from "../../generated/SushiswapFactory/SushiswapFactory";

export function isOwnershipToken(tokenAddress: Address): Boolean {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null || token.type != "ot") {
    return false as Boolean;
  }
  return true as Boolean;
}

export function handleNewSushiswapPair(event: SushiswapPairCreatedEvent): void {
  log.debug("sushi", []);
	if (
    isOwnershipToken(event.params.token0) ||
    isOwnershipToken(event.params.token1)
  ) {
    // OT market by Pendle
    log.debug("Pendle market: {} {} {}", [
      event.params.pair.toHexString(),
      event.params.token0.toHexString(),
      event.params.token1.toHexString()
    ]);
  }
}
