import { Address } from "@graphprotocol/graph-ts";
import { PairCreated as QuickswapPairCreatedEvent } from "../../generated/QuickswapFactory/QuickswapFactory";
import { PricePool } from "../../generated/schema";

export function createQuickswapPair(
  poolAddress: Address,
  token0Address: Address,
  token1Address: Address
): void {
  let id = token0Address.toHexString() + "-" + token1Address.toHexString();
  let poolInstance = PricePool.load(id);
  if (poolInstance) {
    return;
  }
  poolInstance = new PricePool(id);
  poolInstance.poolAddress = poolAddress.toHexString();
  poolInstance.token0Address = token0Address.toHexString();
  poolInstance.token1Address = token1Address.toHexString();
  poolInstance.hasBeenUsed = false;
  poolInstance.save();
}

export function handleQuickswapPairCreated(event: QuickswapPairCreatedEvent): void {
    createQuickswapPair(
    event.params.pair,
    event.params.token0,
    event.params.token1
  );
}

export function getQuickswapPairAddress(
  token0Address: Address,
  token1Address: Address
): Address {
  let id = token0Address.toHexString() + "-" + token1Address.toHexString();
  let poolInstance = PricePool.load(id);
  if (!poolInstance) {
    id = token1Address.toHexString() + "-" + token0Address.toHexString();
    poolInstance = PricePool.load(id);
  }
  if (!poolInstance) {
    return null;
  }
  let poolAddress = Address.fromHexString(poolInstance.poolAddress) as Address;
  poolInstance.hasBeenUsed = true;
  poolInstance.save();
  return poolAddress;
}
