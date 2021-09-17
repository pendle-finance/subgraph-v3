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

export function handleQuickswapPairCreated(
  event: QuickswapPairCreatedEvent
): void {
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

export function initializeQuickSwapPools(): void {
  createQuickswapPair(
    Address.fromString("0xadbf1854e5883eb8aa7baf50705338739e558e5b"),
    Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
    Address.fromString("0x7ceb23fd6bc0add59e62ac25578270cff1b9f619")
  );

  createQuickswapPair(
    Address.fromString("0xeef611894ceae652979c9d0dae1deb597790c6ee"),
    Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
    Address.fromString("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063")
  );

  createQuickswapPair(
    Address.fromString("0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827"),
    Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
    Address.fromString("0x2791bca1f2de4661ed88a30c99a7a9449aa84174")
  );

  createQuickswapPair(
    Address.fromString("0x604229c960e5cacf2aaeac8be68ac07ba9df81c3"),
    Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
    Address.fromString("0xc2132d05d31c914a87c6611c10748aeb04b58e8f")
  );
}
