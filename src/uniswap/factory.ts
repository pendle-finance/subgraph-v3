import { Address } from "@graphprotocol/graph-ts";
import { PricePool } from "../../generated/schema";
import { PoolCreated as UniswapPoolCreatedEvent } from "../../generated/UniswapFactory/UniswapFactory";

export function createUniswapPool(
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

export function handleUniswapPoolCreated(event: UniswapPoolCreatedEvent): void {
  createUniswapPool(
    event.params.pool,
    event.params.token0,
    event.params.token1
  );
}

export function initializeUniswapPools(): void {
  createUniswapPool(
    Address.fromString("0xa80964c5bbd1a0e95777094420555fead1a26c1e"),
    Address.fromString("0x6b175474e89094c44da98b954eedeac495271d0f"),
    Address.fromString("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
  );
  createUniswapPool(
    Address.fromString("0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"),
    Address.fromString("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"),
    Address.fromString("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
  );
}

export function getUniswapPoolAddress(
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
