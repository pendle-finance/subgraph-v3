import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  SwapEvent,
  Join as JoinLiquidityPoolEvent,
  Exit as ExitLiquidityPoolEvent,
  MarketCreated as MarketCreatedEvent
} from "../../generated/PendleRouter/PendleRouter";
import { LiquidityPool, Pair, Swap, Token } from "../../generated/schema";
import { PendleMarket as PendleMarketTemplate } from "../../generated/templates";
import { PendleMarket as PendleMarketContract } from "../../generated/templates/PendleMarket/PendleMarket";
import { getUniswapTokenPrice } from "../uniswap/pricing";
import { updatePairDailyData, updatePairHourData } from "../updates";
import {
  ERROR_COMPOUND_MARKET,
  ONE_BD,
  ONE_BI,
  RONE,
  RONE_BD,
  ZERO_BD,
  ZERO_BI
} from "../utils/consts";
import {
  calcLpPrice,
  convertTokenToDecimal,
  generateNewToken,
  loadPendleData,
  printDebug
} from "../utils/helpers";
import { getLiquidityMining } from "./liquidity-mining-v1";

export function handleSwap(event: SwapEvent): void {
  let pair = Pair.load(event.params.market.toHexString());
  let inToken = Token.load(event.params.inToken.toHexString());
  let outToken = Token.load(event.params.outToken.toHexString());
  let amountIn = convertTokenToDecimal(event.params.exactIn, inToken.decimals);
  let amountOut = convertTokenToDecimal(
    event.params.exactOut,
    outToken.decimals
  );
  let pendleData = loadPendleData();

  // @TODO Find a way to calculate USD amount
  let baseTokenPrice = ZERO_BD;
  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)
  if (inToken.type == "swapBase") {
    baseTokenPrice = getUniswapTokenPrice(inToken as Token);
    derivedAmountUSD = amountIn.times(baseTokenPrice);
  } else {
    baseTokenPrice = getUniswapTokenPrice(outToken as Token);
    derivedAmountUSD = amountOut.times(baseTokenPrice);
  }

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = ZERO_BD; // getTrackedVolumeUSD(amount0Total, token0 as Token, amount1Total, token1 as Token, pair as Pair)

  // update inToken global volume and token liquidity stats
  inToken.tradeVolume = inToken.tradeVolume.plus(amountIn);
  inToken.tradeVolumeUSD = inToken.tradeVolumeUSD.plus(derivedAmountUSD);

  // update outToken global volume and token liquidity stats
  outToken.tradeVolume = outToken.tradeVolume.plus(amountOut);
  outToken.tradeVolumeUSD = outToken.tradeVolumeUSD.plus(derivedAmountUSD);
  // update txn counts
  inToken.txCount = inToken.txCount.plus(ONE_BI);

  outToken.txCount = outToken.txCount.plus(ONE_BI);
  pair.txCount = pair.txCount.plus(ONE_BI);

  // Calculate and update collected fees
  let tokenFee = amountIn.times(pendleData.swapFee);
  let usdFee = derivedAmountUSD.times(pendleData.swapFee);

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  pair.volumeUSD = pair.volumeUSD.plus(derivedAmountUSD);

  if (inToken.id == pair.token0) {
    pair.volumeToken0 = pair.volumeToken0.plus(amountIn);
    pair.volumeToken1 = pair.volumeToken1.plus(amountOut);
    pair.feesToken0 = pair.feesToken0.plus(tokenFee);
  } else if (inToken.id == pair.token1) {
    pair.volumeToken1 = pair.volumeToken1.plus(amountIn);
    pair.volumeToken0 = pair.volumeToken0.plus(amountOut);
    pair.feesToken1 = pair.feesToken1.plus(tokenFee);
  }

  pair.feesUSD = pair.feesUSD.plus(usdFee);

  // save entities
  pair.save();
  inToken.save();
  outToken.save();

  // Create Swap Entity
  let swap = new Swap(event.transaction.hash.toHexString());
  swap.timestamp = event.block.timestamp;
  swap.pair = pair.id;

  swap.sender = event.params.trader;
  swap.from = event.transaction.from;
  swap.inToken = inToken.id;
  swap.outToken = outToken.id;
  swap.inAmount = amountIn;
  swap.outAmount = amountOut;
  swap.to = event.params.trader;
  swap.logIndex = event.logIndex;
  swap.feesCollected = tokenFee;
  swap.feesCollectedUSD = usdFee;
  // use the tracked amount if we have it
  swap.amountUSD = derivedAmountUSD;

  swap.save();
  let pairHourData = updatePairHourData(event, pair as Pair);
  let pairDayData = updatePairDailyData(event, pair as Pair);
  if (inToken.underlyingAsset != "") {
    // inToken is YT

    /// HOURLY
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      amountIn
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      amountOut
    );
    /// DAILY
    pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(
      amountIn
    );
    pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(
      amountOut
    );
  } else {
    /// HOURLY
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      amountOut
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      amountIn
    );

    /// DAILY
    pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(
      amountOut
    );
    pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(
      amountIn
    );
  }
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(
    derivedAmountUSD
  );
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);

  pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(
    derivedAmountUSD
  );
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI);

  pairHourData.save();
  pairDayData.save();
}

export function handleJoinLiquidityPool(event: JoinLiquidityPoolEvent): void {
  if (event.params.market.toHexString() == ERROR_COMPOUND_MARKET) {
    return;
  }
  let pair = Pair.load(event.params.market.toHexString());

  let inToken0 = Token.load(pair.token0);
  let inToken1 = Token.load(pair.token1);
  let inAmount0 = convertTokenToDecimal(
    event.params.token0Amount,
    inToken0.decimals
  );
  let inAmount1 = convertTokenToDecimal(
    event.params.token1Amount,
    inToken1.decimals
  );

  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)
  let rawLpPrice = ZERO_BD;

  rawLpPrice = calcLpPrice(
    event.params.market,
    inToken1.id,
    event.params.token1Amount,
    event.params.exactOutLp.toBigDecimal(),
    true
  );

  derivedAmountUSD = event.params.exactOutLp.toBigDecimal().times(rawLpPrice);

  // Create LiquidityPool Entity
  let liquidityPool = new LiquidityPool(event.transaction.hash.toHexString());
  liquidityPool.timestamp = event.block.timestamp;
  liquidityPool.pair = pair.id;
  liquidityPool.type = "Join";

  liquidityPool.from = event.params.sender;
  liquidityPool.inToken0 = inToken0.id;
  liquidityPool.inToken1 = inToken1.id;
  liquidityPool.inAmount0 = inAmount0;
  liquidityPool.inAmount1 = inAmount1;
  liquidityPool.feesCollected = ZERO_BD;
  liquidityPool.swapFeesCollectedUSD = ZERO_BD;
  liquidityPool.swapVolumeUSD = ZERO_BD;
  // use the tracked amount if we have it
  liquidityPool.amountUSD = derivedAmountUSD;
  liquidityPool.lpAmount = convertTokenToDecimal(
    event.params.exactOutLp,
    BigInt.fromI32(18)
  );

  liquidityPool.save();

  let pairHourData = updatePairHourData(event, pair as Pair);
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
  pairHourData.save();

  let pairDayData = updatePairDailyData(event, pair as Pair);
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI);
  pairDayData.save();

  //Calculating swap fees for add single liq only
  if (
    event.params.token0Amount.notEqual(ZERO_BI) &&
    event.params.token1Amount.notEqual(ZERO_BI)
  ) {
    return;
  }

  /**
   * It will always refer to YT Token
   */
  let rawAmount = event.params.token0Amount;
  let rawWeight = pair.token0WeightRaw;
  let tokenPriceFormatted = pair.token0Price;
  let inToken = inToken0;

  /**
   * It will always refer to base Token
   */
  if (event.params.token1Amount.gt(ZERO_BI)) {
    rawAmount = event.params.token1Amount;
    rawWeight = pair.token1WeightRaw;
    tokenPriceFormatted = pair.token1Price;
    inToken = inToken1;
  }
  let poweredTokenDecimal = BigInt.fromI32(10)
    .pow(inToken.decimals.toI32() as u8)
    .toBigDecimal();
  let rawSwapAmount = rawAmount.times(RONE.minus(rawWeight)).div(RONE);

  let pendleData = loadPendleData();

  let usdVolume = rawSwapAmount
    .toBigDecimal()
    .div(poweredTokenDecimal)
    .times(tokenPriceFormatted);
  let usdFee = usdVolume.times(pendleData.swapFee);

  liquidityPool.swapFeesCollectedUSD = usdFee;
  liquidityPool.swapVolumeUSD = usdVolume;

  pair.feesUSD = pair.feesUSD.plus(usdFee);
  pair.volumeUSD = pair.volumeUSD.plus(usdVolume);

  liquidityPool.save();
  pair.save();

  // Add single
  if (
    event.params.token0Amount.equals(ZERO_BI) ||
    event.params.token1Amount.equals(ZERO_BI)
  ) {
    let lpOut = event.params.exactOutLp.toBigDecimal();
    let totalLp = pair.totalSupply;
    let token0Weight = pair.token0WeightRaw.toBigDecimal().div(RONE_BD);
    let token0Lp = lpOut.times(token0Weight);
    let token1Lp = lpOut.minus(token0Lp);
    let token0Amount = pair.reserve0
      .times(token0Lp)
      .div(totalLp.times(token0Weight));
    let token1Amount = pair.reserve1
      .times(token1Lp)
      .div(totalLp.times(ONE_BD.minus(token0Weight)));
    let volumeUSD = token1Amount.times(getUniswapTokenPrice(inToken1 as Token));

    /// HOURLY
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      token0Amount
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      token1Amount
    );
    pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(volumeUSD);

    /// DAILY
    pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(
      token0Amount
    );
    pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(
      token1Amount
    );
    pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(volumeUSD);
  }
  pairHourData.save();
  pairDayData.save();
}

export function handleExitLiquidityPool(event: ExitLiquidityPoolEvent): void {
  if (event.params.market.toHexString() == ERROR_COMPOUND_MARKET) {
    return;
  }
  let pair = Pair.load(event.params.market.toHexString());
  let outToken0 = Token.load(pair.token0);
  let outToken1 = Token.load(pair.token1);
  let outAmount0 = convertTokenToDecimal(
    event.params.token0Amount,
    outToken0.decimals
  );
  let outAmount1 = convertTokenToDecimal(
    event.params.token1Amount,
    outToken1.decimals
  );

  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)
  let rawLpPrice = ZERO_BD;

  rawLpPrice = calcLpPrice(
    event.params.market,
    outToken1.id,
    event.params.token1Amount,
    event.params.exactInLp.toBigDecimal(),
    false
  );

  derivedAmountUSD = event.params.exactInLp.toBigDecimal().times(rawLpPrice);

  // update pair volume data, use tracked amount if we have it as its probably more accurate

  // Create LiquidityPool Entity
  let liquidityPool = new LiquidityPool(event.transaction.hash.toHexString());
  liquidityPool.timestamp = event.block.timestamp;
  liquidityPool.pair = pair.id;
  liquidityPool.type = "Exit";

  liquidityPool.from = event.params.sender;
  liquidityPool.inToken0 = outToken0.id;
  liquidityPool.inToken1 = outToken1.id;
  liquidityPool.inAmount0 = outAmount0;
  liquidityPool.inAmount1 = outAmount1;
  liquidityPool.feesCollected = ZERO_BD;
  liquidityPool.swapFeesCollectedUSD = ZERO_BD;
  liquidityPool.swapVolumeUSD = ZERO_BD;
  // use the tracked amount if we have it
  liquidityPool.amountUSD = derivedAmountUSD;
  liquidityPool.lpAmount = convertTokenToDecimal(
    event.params.exactInLp,
    BigInt.fromI32(18)
  );

  liquidityPool.save();
  let pairHourData = updatePairHourData(event, pair as Pair);
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
  pairHourData.save();

  let pairDayData = updatePairDailyData(event, pair as Pair);
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI);
  pairDayData.save();

  if (
    event.params.token0Amount.notEqual(ZERO_BI) &&
    event.params.token1Amount.notEqual(ZERO_BI)
  ) {
    return;
  }

  /**
   * It will always refer to YT Token
   */
  let rawAmount = event.params.token0Amount;
  let rawWeight = pair.token0WeightRaw;
  let tokenPriceFormatted = pair.token0Price;
  let outToken = outToken0;

  /**
   * It will always refer to base Token
   */
  if (event.params.token1Amount.gt(ZERO_BI)) {
    rawAmount = event.params.token1Amount;
    rawWeight = pair.token1WeightRaw;
    tokenPriceFormatted = pair.token1Price;
    outToken = outToken1;
  }
  let poweredTokenDecimal = BigInt.fromI32(10)
    .pow(outToken.decimals.toI32() as u8)
    .toBigDecimal();

  let rawSwapAmount = rawAmount.times(RONE.minus(rawWeight)).div(RONE);

  let pendleData = loadPendleData();

  let usdVolume = rawSwapAmount
    .toBigDecimal()
    .div(poweredTokenDecimal)
    .times(tokenPriceFormatted);
  let usdFee = usdVolume.times(pendleData.swapFee);

  liquidityPool.swapFeesCollectedUSD = usdFee;
  liquidityPool.swapVolumeUSD = usdVolume;

  pair.feesUSD = pair.feesUSD.plus(usdFee);
  pair.volumeUSD = pair.volumeUSD.plus(usdVolume);

  liquidityPool.save();
  pair.save();

  // Remove single
  if (
    event.params.token0Amount.equals(ZERO_BI) ||
    event.params.token1Amount.equals(ZERO_BI)
  ) {
    let lpIn = event.params.exactInLp.toBigDecimal();

    let totalLp = pair.totalSupply.plus(lpIn);
    let reserve0 = pair.reserve0.plus(outAmount0);
    let reserve1 = pair.reserve1.plus(outAmount1);

    let token0Weight = pair.token0WeightRaw.toBigDecimal().div(RONE_BD);
    let token0Lp = lpIn.times(token0Weight);
    let token1Lp = lpIn.minus(token0Lp);
    let token0Amount = reserve0.times(
      token0Lp.div(totalLp.times(token0Weight))
    );
    let token1Amount = reserve1.times(
      token1Lp.div(totalLp.times(ONE_BD.minus(token0Weight)))
    );

    let volumeUSD = token1Amount.times(
      getUniswapTokenPrice(outToken1 as Token)
    );

    /// HOURLY
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      token0Amount
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      token1Amount
    );
    pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(volumeUSD);

    /// DAILY
    pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(
      token0Amount
    );
    pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(
      token1Amount
    );
    pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(volumeUSD);
  }
  pairDayData.save();
  pairHourData.save();
}

export function handleMarketCreated(event: MarketCreatedEvent): void {
  // skip error market
  if (event.params.market.toHexString() == ERROR_COMPOUND_MARKET) {
    return;
  }
  // create the tokens
  let token0 = Token.load(event.params.xyt.toHexString());
  let token1 = Token.load(event.params.token.toHexString());
  //Generating LP Token
  generateNewToken(event.params.market);

  // fetch info if null
  if (token0 === null) {
    token0 = generateNewToken(event.params.xyt);
  }

  // fetch info if null
  if (token1 === null) {
    token1 = generateNewToken(event.params.token);
  }

  // Bailing if token0 or token1 is still null
  if (token0 === null || token1 === null) {
    return;
  }

  token0.type = "yt";
  token1.type = "swapBase";

  let pair = new Pair(event.params.market.toHexString());

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

  let lm = getLiquidityMining(event.params.market);

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

/*
{
  debugLogs(first:10){
    message
  }
}
*/
