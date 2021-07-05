import { log } from "@graphprotocol/graph-ts";
import { UniswapPool } from "../../generated/schema";
import { PoolCreated as UniswapPoolCreatedEvent } from "../../generated/UniswapFactory/UniswapFactory";

export function handleUniswapPoolCreated(event: UniswapPoolCreatedEvent): void {
  let poolId =
    event.params.token0.toHexString() + "-" + event.params.token1.toHexString();
  let pool = new UniswapPool(poolId);

  pool.poolAddress = event.params.pool.toHexString();
  pool.token0Address = event.params.token0.toHexString();
  pool.token1Address = event.params.token1.toHexString();
  pool.save();
}
