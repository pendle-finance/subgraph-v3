import { Pair, SushiswapPair } from "../../generated/schema";
import {
  PendleLiquidityMiningV2 as LMv2Contract,
  Staked as StakeEvent,
  Withdrawn as WithdrawnEvent
} from "../../generated/templates/PendleLiquidityMiningV2/PendleLiquidityMiningV2";
import { updateMarketLiquidityMiningApr } from "./market";
import { getOtApr } from "../sushiswap/factory";

export function handleStake(event: StakeEvent): void {
  let lmContract = LMv2Contract.bind(event.address);
  let poolAddress = lmContract.stakeToken();
  let otpair = SushiswapPair.load(poolAddress.toHexString());
  let ytpair = Pair.load(poolAddress.toHexString());
  if (otpair != null) getOtApr(otpair as SushiswapPair, event.block.timestamp);
  if (ytpair != null)
    updateMarketLiquidityMiningApr(poolAddress, event.block.timestamp);
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  let lmContract = LMv2Contract.bind(event.address);
  let poolAddress = lmContract.stakeToken();
  let otpair = SushiswapPair.load(poolAddress.toHexString());
  let ytpair = Pair.load(poolAddress.toHexString());
  if (otpair != null) getOtApr(otpair as SushiswapPair, event.block.timestamp);
  if (ytpair != null)
    updateMarketLiquidityMiningApr(poolAddress, event.block.timestamp);
}
