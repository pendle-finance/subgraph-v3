import { Pair, SushiswapPair } from "../../generated/schema";
import {
  PendleLiquidityMiningV2 as LMv2Contract,
  Staked as StakeEvent,
  Withdrawn as WithdrawnEvent
} from "../../generated/templates/PendleLiquidityMiningV2/PendleLiquidityMiningV2";
import { updateMarketLiquidityMiningApr } from "./market";
import { getOtApr } from "../sushiswap/factory";
import { updateUserMarketDataOt } from "../uniswapv2/factory";
import { MONE_BI } from "../utils/consts";

export function handleStake(event: StakeEvent): void {
  let lmContract = LMv2Contract.bind(event.address);
  let poolAddress = lmContract.stakeToken();
  let otpair = SushiswapPair.load(poolAddress.toHexString());
  let ytpair = Pair.load(poolAddress.toHexString());
  if (otpair != null) getOtApr(otpair as SushiswapPair, event.block.timestamp);
  if (ytpair != null) {
    updateMarketLiquidityMiningApr(event.block.timestamp, ytpair as Pair);
  }
  updateUserMarketDataOt(
    event.params.user,
    lmContract.stakeToken(),
    event.params.amount
  );

  updateUserMarketDataOt(
    event.address,
    lmContract.stakeToken(),
    event.params.amount.times(MONE_BI)
  );
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  let lmContract = LMv2Contract.bind(event.address);
  let poolAddress = lmContract.stakeToken();
  let otpair = SushiswapPair.load(poolAddress.toHexString());
  let ytpair = Pair.load(poolAddress.toHexString());
  if (otpair != null) getOtApr(otpair as SushiswapPair, event.block.timestamp);
  if (ytpair != null) {
    updateMarketLiquidityMiningApr(event.block.timestamp, ytpair as Pair);
  }

  updateUserMarketDataOt(
    event.params.user,
    lmContract.stakeToken(),
    event.params.amount.times(MONE_BI)
  );

  updateUserMarketDataOt(
    event.address,
    lmContract.stakeToken(),
    event.params.amount
  );
}
