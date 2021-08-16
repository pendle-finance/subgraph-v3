import { SushiswapPair } from "../../generated/schema";
import {
  PendleLiquidityMiningV2 as LMv2Contract,
  Staked as StakeEvent,
  Withdrawn as WithdrawnEvent
} from "../../generated/templates/PendleLiquidityMiningV2/PendleLiquidityMiningV2";

import { getOtApr } from "../sushiswap/factory";

export function handleStake(event: StakeEvent): void {
  let lmContract = LMv2Contract.bind(event.address);
  let poolAddress = lmContract.stakeToken();
  let pair = SushiswapPair.load(poolAddress.toHexString());
  if (pair == null) return;
  getOtApr(pair as SushiswapPair, event.block.timestamp);
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  let lmContract = LMv2Contract.bind(event.address);
  let poolAddress = lmContract.stakeToken();
  let pair = SushiswapPair.load(poolAddress.toHexString());
  if (pair == null) return;
  getOtApr(pair as SushiswapPair, event.block.timestamp);
}
