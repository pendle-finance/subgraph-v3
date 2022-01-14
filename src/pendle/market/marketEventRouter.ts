import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { LiquidityPool, Pair, Swap, Token } from "../../../generated/schema";
import { getTokenPrice } from "../../pricing";
import { updateUserTrade } from "../../tradeMining/tradeMining";
import { addHourlyDailyTxn, addHourlyDailyVolume } from "../../updates";
import {
  ONE_BD,
  ONE_BI,
  RONE,
  RONE_BD,
  ZERO_BD,
  ZERO_BI
} from "../../utils/consts";
import { calcLpPrice, convertTokenToDecimal } from "../../utils/helpers";
import { loadPendleData, loadUser } from "../../utils/load-entity";

export function handleSwapInfo(
  marketAddress: Address,
  inTokenAddress: Address,
  outTokenAddress: Address,
  exactIn: BigInt,
  exactOut: BigInt,
  traderAddress: Address,
  event: ethereum.Event
): void {
  let pair = Pair.load(marketAddress.toHexString());
  let inToken = Token.load(inTokenAddress.toHexString());
  let outToken = Token.load(outTokenAddress.toHexString());
  let amountIn = convertTokenToDecimal(exactIn, inToken.decimals);
  let amountOut = convertTokenToDecimal(exactOut, outToken.decimals);
  let pendleData = loadPendleData();

  // @TODO Find a way to calculate USD amount
  let baseTokenPrice = ZERO_BD;
  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)
  if (inToken.type == "swapBase") {
    baseTokenPrice = getTokenPrice(inToken as Token);
    derivedAmountUSD = amountIn.times(baseTokenPrice);
  } else {
    baseTokenPrice = getTokenPrice(outToken as Token);
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

  swap.sender = traderAddress;
  swap.from = event.transaction.from;
  swap.inToken = inToken.id;
  swap.outToken = outToken.id;
  swap.inAmount = amountIn;
  swap.outAmount = amountOut;
  swap.to = traderAddress;
  swap.logIndex = event.logIndex;
  swap.feesCollected = tokenFee;
  swap.feesCollectedUSD = usdFee;
  // use the tracked amount if we have it
  swap.amountUSD = derivedAmountUSD;

  swap.save();

  // Trade Mining
  updateUserTrade(
    loadUser(traderAddress),
    pair as Pair,
    derivedAmountUSD,
    event.block.timestamp,
    "swap"
  );

  // CandleStick Chart
  addHourlyDailyTxn(event.block.timestamp, pair as Pair);
  if (inToken.id == pair.token0) {
    addHourlyDailyVolume(
      event.block.timestamp,
      pair as Pair,
      amountIn,
      amountOut,
      derivedAmountUSD
    );
  } else {
    addHourlyDailyVolume(
      event.block.timestamp,
      pair as Pair,
      amountOut,
      amountIn,
      derivedAmountUSD
    );
  }
}

export function handleJoinInfo(
  marketAddress: Address,
  token0Amount: BigInt,
  token1Amount: BigInt,
  exactOutLp: BigInt,
  traderAddress: Address,
  event: ethereum.Event
): void {
  let pair = Pair.load(marketAddress.toHexString());
  let inToken0 = Token.load(pair.token0);
  let inToken1 = Token.load(pair.token1);
  let inAmount0 = convertTokenToDecimal(token0Amount, inToken0.decimals);
  let inAmount1 = convertTokenToDecimal(token1Amount, inToken1.decimals);

  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)
  let rawLpPrice = ZERO_BD;

  rawLpPrice = calcLpPrice(
    marketAddress,
    inToken1.id,
    token1Amount,
    exactOutLp.toBigDecimal(),
    true
  );

  derivedAmountUSD = exactOutLp.toBigDecimal().times(rawLpPrice);

  // Create LiquidityPool Entity
  let liquidityPool = new LiquidityPool(event.transaction.hash.toHexString());
  liquidityPool.timestamp = event.block.timestamp;
  liquidityPool.pair = pair.id;
  liquidityPool.type = "Join";

  liquidityPool.from = traderAddress;
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
    exactOutLp,
    BigInt.fromI32(18)
  );

  liquidityPool.save();

  addHourlyDailyTxn(event.block.timestamp, pair as Pair);

  //Calculating swap fees for add single liq only
  if (token0Amount.notEqual(ZERO_BI) && token1Amount.notEqual(ZERO_BI)) {
    return;
  }

  /**
   * It will always refer to YT Token
   */
  let rawAmount = token0Amount;
  let rawWeight = pair.token0WeightRaw;
  let tokenPriceFormatted = pair.token0Price;
  let inToken = inToken0;

  /**
   * It will always refer to base Token
   */
  if (token1Amount.gt(ZERO_BI)) {
    rawAmount = token1Amount;
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
  if (token0Amount.equals(ZERO_BI) || token1Amount.equals(ZERO_BI)) {
    let lpOut = exactOutLp.toBigDecimal();
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
    let volumeUSD = token1Amount.times(getTokenPrice(inToken1 as Token));

    updateUserTrade(
      loadUser(traderAddress),
      pair as Pair,
      volumeUSD,
      event.block.timestamp,
      "addSingle"
    );

    addHourlyDailyVolume(
      event.block.timestamp,
      pair as Pair,
      token0Amount,
      token1Amount,
      volumeUSD
    );
  }
}

export function handleExitInfo(
  marketAddress: Address,
  token0Amount: BigInt,
  token1Amount: BigInt,
  exactInLp: BigInt,
  traderAddress: Address,
  event: ethereum.Event
): void {
  let pair = Pair.load(marketAddress.toHexString());
  let outToken0 = Token.load(pair.token0);
  let outToken1 = Token.load(pair.token1);
  let outAmount0 = convertTokenToDecimal(token0Amount, outToken0.decimals);
  let outAmount1 = convertTokenToDecimal(token1Amount, outToken1.decimals);

  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)
  let rawLpPrice = ZERO_BD;

  rawLpPrice = calcLpPrice(
    marketAddress,
    outToken1.id,
    token1Amount,
    exactInLp.toBigDecimal(),
    false
  );

  derivedAmountUSD = exactInLp.toBigDecimal().times(rawLpPrice);

  // update pair volume data, use tracked amount if we have it as its probably more accurate

  // Create LiquidityPool Entity
  let liquidityPool = new LiquidityPool(event.transaction.hash.toHexString());
  liquidityPool.timestamp = event.block.timestamp;
  liquidityPool.pair = pair.id;
  liquidityPool.type = "Exit";

  liquidityPool.from = traderAddress;
  liquidityPool.inToken0 = outToken0.id;
  liquidityPool.inToken1 = outToken1.id;
  liquidityPool.inAmount0 = outAmount0;
  liquidityPool.inAmount1 = outAmount1;
  liquidityPool.feesCollected = ZERO_BD;
  liquidityPool.swapFeesCollectedUSD = ZERO_BD;
  liquidityPool.swapVolumeUSD = ZERO_BD;
  // use the tracked amount if we have it
  liquidityPool.amountUSD = derivedAmountUSD;
  liquidityPool.lpAmount = convertTokenToDecimal(exactInLp, BigInt.fromI32(18));

  liquidityPool.save();
  addHourlyDailyTxn(event.block.timestamp, pair as Pair);

  if (token0Amount.notEqual(ZERO_BI) && token1Amount.notEqual(ZERO_BI)) {
    return;
  }

  /**
   * It will always refer to YT Token
   */
  let rawAmount = token0Amount;
  let rawWeight = pair.token0WeightRaw;
  let tokenPriceFormatted = pair.token0Price;
  let outToken = outToken0;

  /**
   * It will always refer to base Token
   */
  if (token1Amount.gt(ZERO_BI)) {
    rawAmount = token1Amount;
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
  if (token0Amount.equals(ZERO_BI) || token1Amount.equals(ZERO_BI)) {
    let lpIn = exactInLp.toBigDecimal();

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

    let volumeUSD = token1Amount.times(getTokenPrice(outToken1 as Token));

    // Trade Mining
    updateUserTrade(
      loadUser(traderAddress),
      pair as Pair,
      volumeUSD,
      event.block.timestamp,
      "removeSingle"
    );

    addHourlyDailyVolume(
      event.block.timestamp,
      pair as Pair,
      token0Amount,
      token1Amount,
      volumeUSD
    );
  }
}
