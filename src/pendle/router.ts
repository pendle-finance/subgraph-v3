import { Address } from "@graphprotocol/graph-ts";
import {
  SwapEvent,
  Join as JoinLiquidityPoolEvent,
  Exit as ExitLiquidityPoolEvent,
  MarketCreated as MarketCreatedEvent,
  RedeemLpInterestsCall
} from "../../generated/PendleRouter/PendleRouter";
import { Pair } from "../../generated/schema";
import { PendleMarket as PendleMarketTemplate } from "../../generated/templates";
import { PendleMarket as PendleMarketContract } from "../../generated/templates/PendleMarket/PendleMarket";
import {
  ERROR_COMPOUND_MARKET,
  ZERO_BD,
  ZERO_BI,
  PENDLE_WRAPPER
} from "../utils/consts";
import { loadToken, loadUser } from "../utils/load-entity";
import { getMarketLiquidityMining } from "./liquidity-mining-v1";
import {
  handleExitInfo,
  handleJoinInfo,
  handleSwapInfo
} from "./market/marketEventRouter";

export function handleSwap(event: SwapEvent): void {
  if (event.params.trader.equals(PENDLE_WRAPPER)) return;
  handleSwapInfo(
    event.params.market,
    event.params.inToken,
    event.params.outToken,
    event.params.exactIn,
    event.params.exactOut,
    event.params.trader,
    event
  );
}

export function handleJoinLiquidityPool(event: JoinLiquidityPoolEvent): void {
  if (event.params.market.toHexString() == ERROR_COMPOUND_MARKET) {
    return;
  }
  if (event.params.sender.equals(PENDLE_WRAPPER)) return;
  handleJoinInfo(
    event.params.market,
    event.params.token0Amount,
    event.params.token1Amount,
    event.params.exactOutLp,
    event.params.sender,
    event
  );
}

export function handleExitLiquidityPool(event: ExitLiquidityPoolEvent): void {
  if (event.params.market.toHexString() == ERROR_COMPOUND_MARKET) {
    return;
  }
  if (event.params.sender.equals(PENDLE_WRAPPER)) return;
  handleExitInfo(
    event.params.market,
    event.params.token0Amount,
    event.params.token1Amount,
    event.params.exactInLp,
    event.params.sender,
    event
  );
}

export function handleMarketCreated(event: MarketCreatedEvent): void {
  // skip error market
  if (event.params.market.toHexString() == ERROR_COMPOUND_MARKET) {
    return;
  }
  // create the tokens
  let token0 = loadToken(event.params.xyt);
  let token1 = loadToken(event.params.token);
  //Generating LP Token
  loadToken(event.params.market);

  // Bailing if token0 or token1 is still null
  if (token0 === null || token1 === null) {
    return;
  }

  let pair = new Pair(event.params.market.toHexString());

  let token0Markets = token0.markets;
  token0Markets.push(pair.id);
  token0.markets = token0Markets;
  token0.type = "yt";

  let token1Markets = token1.markets;
  token1Markets.push(pair.id);
  token1.markets.push(pair.id);
  token1.type = "swapBase";

  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.token0WeightRaw = ZERO_BI;
  pair.token1WeightRaw = ZERO_BI;
  pair.liquidityProviderCount = ZERO_BI;
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  pair.txCount = ZERO_BI;
  pair.feesToken0 = ZERO_BD;
  pair.feesToken1 = ZERO_BD;
  pair.feesUSD = ZERO_BD;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  pair.volumeToken0 = ZERO_BD;
  pair.volumeToken1 = ZERO_BD;
  pair.volumeUSD = ZERO_BD;
  // pair.untrackedVolumeUSD = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;
  pair.lpStaked = ZERO_BD;
  pair.lpPriceUSD = ZERO_BD;
  pair.lpStakedUSD = ZERO_BD;

  let lm = getMarketLiquidityMining(event.params.market);

  if (lm != null) pair.liquidityMining = lm.id;

  // create the tracked contract based on the template
  PendleMarketTemplate.create(event.params.market);
  // get market expiry
  let market = PendleMarketContract.bind(
    Address.fromHexString(pair.id) as Address
  );
  pair.expiry = market.expiry();

  // save updated values
  token0.save();
  token1.save();
  pair.save();
}

export function handleRedeemLpInterests(call: RedeemLpInterestsCall): void {
  // redeemLpInterests(call.inputs.user, call.inputs.market, call.outputs.interests);
}
