import {
  BigInt,
  Address,
  ByteArray,
  BigDecimal,
  log
} from "@graphprotocol/graph-ts";
import {
  SwapEvent,
  Join as JoinLiquidityPoolEvent,
  Exit as ExitLiquidityPoolEvent,
  PendleRouter as PendleRouterContract,
  MarketCreated as MarketCreatedEvent
} from "../generated/PendleRouter/PendleRouter";
import {
  NewYieldContracts as NewYieldContractsEvent,
  RedeemYieldToken as RedeemYieldTokenEvent,
  MintYieldTokens as MintYieldTokenEvent
} from "../generated/templates/IPendleForge/IPendleForge";

import { ICToken as ICTokenContract } from "../generated/templates/IPendleForge/ICToken";
import {
  IPendleForge as PendleForgeTemplate,
  PendleMarket as PendleMarketTemplate
} from "../generated/templates";
import {
  Sync as SyncEvent,
  PendleMarket as PendleMarketContract
  // Mint as MintLPTokenEvent,
} from "../generated/templates/PendleMarket/PendleMarket";
import {
  PendleData as PendleDataContract,
  ForgeAdded as NewForgeEvent,
  NewMarketFactory as NewMarketFactoryEvent,
  MarketFeesSet as MarketFeesSetEvent
} from "../generated/PendleData/PendleData";

import {
  Forge,
  Token,
  YieldContract,
  MintYieldToken,
  RedeemYieldToken,
  Pair,
  Transaction,
  MintLPToken,
  Swap,
  PendleData,
  LiquidityPool,
  MarketFactory,
  UniswapPool
} from "../generated/schema";
import {
  convertTokenToDecimal,

  // fetchTokenSymbol,
  // fetchTokenName,
  // fetchTokenDecimals,
  fetchTokenTotalSupply,
  generateNewToken,
  loadUser,
  createLiquidityPosition,
  createLiquiditySnapshot,
  calcLpPrice
} from "./utils/helpers";

import {
  ZERO_BD,
  ZERO_BI,
  ONE_BI,
  BI_18,
  ADDRESS_ZERO,
  RONE_BD,
  ONE_BD,
  RONE
} from "./utils/consts";

import { getUniswapTokenPrice } from "./uniswap/pricing";
import { initializeUniswapPools } from "./uniswap/factory";
import { updatePairHourData } from "./updates";

/* ** MISC Functions */
/**
 * @dev Loads pendle data, if none exists automatically creates new one.
 * When loading Pendle Data it will always fetch the latest swap and exit fee
 * directly from the contract to get latest results.
 *
 */
function loadPendleData(): PendleData {
  let pendleData = PendleData.load("1");
  if (pendleData === null) {
    pendleData = new PendleData("1");
    pendleData.protocolSwapFee = ZERO_BD;
    pendleData.swapFee = ZERO_BD;
    pendleData.exitFee = ZERO_BD;
  }

  pendleData.save();
  return pendleData as PendleData;
}

/** PENDLE DATA EVENTS */
export function handleMarketFeesSet(event: MarketFeesSetEvent): void {
  let pendleData = loadPendleData();

  pendleData.swapFee = event.params._swapFee
    .toBigDecimal()
    .div(RONE.toBigDecimal());
  pendleData.protocolSwapFee = event.params._swapFee
    .toBigDecimal()
    .div(RONE.toBigDecimal());

  pendleData.save();
}

/** PENDLE ROUTER EVENTS */
export function handleNewForge(event: NewForgeEvent): void {
  // This line is put here on the purpose that its just gonna run once at the start of Pendle subgraph
  initializeUniswapPools();
  let forge = new Forge(event.params.forgeAddress.toHexString());
  forge.forgeId = event.params.forgeId.toString();
  forge.save();

  PendleForgeTemplate.create(event.params.forgeAddress);
}

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
    baseTokenPrice = getUniswapTokenPrice(inToken);
    derivedAmountUSD = amountIn.times(baseTokenPrice);
  } else {
    baseTokenPrice = getUniswapTokenPrice(outToken);
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
  if (inToken.underlyingAsset != "") {
    // inToken is YT
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      amountIn
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      amountOut
    );
  } else {
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      amountOut
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      amountIn
    );
  }
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(
    derivedAmountUSD
  );
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
  pairHourData.save();
}

export function handleJoinLiquidityPool(event: JoinLiquidityPoolEvent): void {
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

  let pairHourData = updatePairHourData(event, pair as Pair);
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

    let token0Amount = pair.reserve0.times(token0Lp).div(totalLp);
    let token1Amount = pair.reserve1.times(token1Lp).div(totalLp);

    let volumeUSD = token1Amount.times(getUniswapTokenPrice(inToken1));
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      token0Amount
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      token1Amount
    );
    pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(volumeUSD);
  }
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
}

export function handleExitLiquidityPool(event: ExitLiquidityPoolEvent): void {
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

  let pairHourData = updatePairHourData(event, pair as Pair);
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
    let token0Amount = reserve0.times(token0Lp).div(totalLp);
    let token1Amount = reserve1.times(token1Lp).div(totalLp);

    let volumeUSD = token1Amount.times(getUniswapTokenPrice(outToken1));
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      token0Amount
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      token1Amount
    );
    pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(volumeUSD);
  }
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
}

export function handleNewMarketFactory(event: NewMarketFactoryEvent): void {
  let newMarketFactory = new MarketFactory(
    event.params.marketFactoryId.toString()
  );
  newMarketFactory.address = event.params.marketFactoryAddress.toHexString();
  newMarketFactory.save();
}

/* ** PENDLE FORGE EVENTS */
export function handleNewYieldContracts(event: NewYieldContractsEvent): void {
  let forgeId = event.params.forgeId.toString();
  let underlyingToken = generateNewToken(event.params.underlyingAsset);
  let yieldBearingToken = generateNewToken(event.params.yieldBearingAsset);
  let xytToken = generateNewToken(event.params.xyt);
  let otToken = generateNewToken(event.params.ot);

  // Setting up yield tokens
  xytToken.forgeId = forgeId;
  xytToken.underlyingAsset = yieldBearingToken.id;
  xytToken.type = "yt";

  otToken.forgeId = forgeId;
  otToken.underlyingAsset = yieldBearingToken.id;
  otToken.type = "ot";

  yieldBearingToken.forgeId = forgeId;
  yieldBearingToken.underlyingAsset = underlyingToken.id;
  yieldBearingToken.type = "yieldBearing";

  log.debug("Ownership token!!: {}", [otToken.id]);

  xytToken.save();
  otToken.save();
  yieldBearingToken.save();

  if (xytToken === null || otToken === null) return;

  let yieldContract = new YieldContract(
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString()
  );
  yieldContract.forgeId = forgeId;

  yieldContract.underlyingAsset = underlyingToken.id;
  yieldContract.yieldBearingAsset = yieldBearingToken.id;
  yieldContract.xyt = xytToken.id;
  yieldContract.ot = otToken.id;
  yieldContract.expiry = event.params.expiry;

  yieldContract.mintTxCount = ZERO_BI;
  yieldContract.redeemTxCount = ZERO_BI;
  yieldContract.interestSettledTxCount = ZERO_BI;

  // Volume
  yieldContract.lockedVolume = ZERO_BD;
  yieldContract.mintVolume = ZERO_BD;
  yieldContract.redeemVolume = ZERO_BD;

  // Volume USD
  yieldContract.lockedVolumeUSD = ZERO_BD;
  yieldContract.mintVolumeUSD = ZERO_BD;
  yieldContract.redeemVolumeUSD = ZERO_BD;

  yieldContract.interestSettledVolume = ZERO_BD;

  yieldContract.save();
  xytToken.save();
  otToken.save();
  underlyingToken.save();
  yieldBearingToken.save();
}

export function handleMintYieldToken(event: MintYieldTokenEvent): void {
  let underlyingToken = Token.load(event.params.underlyingAsset.toHexString());
  let forgeId = event.params.forgeId.toString();
  let yieldContractid =
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString();
  let yieldContract = YieldContract.load(yieldContractid);

  let xytToken = Token.load(yieldContract.xyt);
  let otToken = Token.load(yieldContract.ot);
  let yieldBearingToken = Token.load(yieldContract.yieldBearingAsset);
  let yieldTokenPrice = getUniswapTokenPrice(yieldBearingToken);

  // Getting the mint volume
  let newMintVolume = convertTokenToDecimal(
    event.params.amountToTokenize,
    yieldBearingToken.decimals
  );

  let newMintVolumeUSD = newMintVolume.times(yieldTokenPrice);

  yieldContract.lockedVolume = yieldContract.lockedVolume.plus(newMintVolume);
  yieldContract.mintVolume = yieldContract.mintVolume.plus(newMintVolume);
  underlyingToken.mintVolume = underlyingToken.mintVolume.plus(newMintVolume);

  yieldContract.lockedVolumeUSD = yieldContract.lockedVolume.times(
    yieldTokenPrice
  );
  yieldContract.mintVolumeUSD = yieldContract.mintVolume.times(yieldTokenPrice);

  underlyingToken.txCount = underlyingToken.txCount.plus(ONE_BI);
  yieldContract.mintTxCount = yieldContract.mintTxCount.plus(ONE_BI);
  underlyingToken.save();
  yieldContract.save();

  //Updating OT and XYT total supply
  xytToken.totalSupply = fetchTokenTotalSupply(
    ByteArray.fromHexString(yieldContract.xyt) as Address
  );
  otToken.totalSupply = fetchTokenTotalSupply(
    ByteArray.fromHexString(yieldContract.ot) as Address
  );

  xytToken.save();
  otToken.save();

  // Creating new MintYieldToken entity
  let mintYieldToken = new MintYieldToken(event.transaction.hash.toHexString());
  mintYieldToken.mintedValueUSD = newMintVolumeUSD;

  mintYieldToken.blockNumber = event.block.number;
  mintYieldToken.timestamp = event.block.timestamp;

  mintYieldToken.forgeId = forgeId;
  mintYieldToken.amountToTokenize = newMintVolume;
  mintYieldToken.amountMinted = convertTokenToDecimal(
    event.params.amountTokenMinted,
    xytToken.decimals
  );

  mintYieldToken.expiry = event.params.expiry;
  mintYieldToken.from = event.transaction.from;
  mintYieldToken.underlyingAsset = underlyingToken.id;
  mintYieldToken.yieldContract = yieldContract.id;
  mintYieldToken.yieldBearingAsset = yieldContract.yieldBearingAsset;
  mintYieldToken.xytAsset = xytToken.id;
  mintYieldToken.otAsset = otToken.id;
  mintYieldToken.save();
}

export function handleRedeemYieldContracts(event: RedeemYieldTokenEvent): void {
  let forgeId = event.params.forgeId.toString();
  let underlyingToken = Token.load(event.params.underlyingAsset.toHexString());
  let yieldContractid =
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString();
  let yieldContract = YieldContract.load(yieldContractid);
  let yieldBearingToken = Token.load(yieldContract.yieldBearingAsset);

  // Getting the mint volume
  let newRedeenVolume = convertTokenToDecimal(
    event.params.redeemedAmount,
    yieldBearingToken.decimals
  );

  let yieldTokenPrice = getUniswapTokenPrice(yieldBearingToken);
  let newRedeenVolumeUSD = newRedeenVolume.times(yieldTokenPrice);

  yieldContract.redeemVolume = yieldContract.redeemVolume.plus(newRedeenVolume);
  yieldContract.lockedVolume = yieldContract.lockedVolume.minus(
    newRedeenVolume
  );
  underlyingToken.redeemVolume = underlyingToken.redeemVolume.plus(
    newRedeenVolume
  );

  yieldContract.redeemVolumeUSD = yieldContract.redeemVolume.times(
    yieldTokenPrice
  );
  yieldContract.lockedVolumeUSD = yieldContract.lockedVolume.times(
    yieldTokenPrice
  );

  underlyingToken.txCount = underlyingToken.txCount.plus(ONE_BI);
  yieldContract.redeemTxCount = yieldContract.redeemTxCount.plus(ONE_BI);
  underlyingToken.save();
  yieldContract.save();

  //Updating OT and XYT total supply
  let xytToken = Token.load(yieldContract.xyt);
  let otToken = Token.load(yieldContract.ot);

  xytToken.totalSupply = fetchTokenTotalSupply(
    ByteArray.fromHexString(yieldContract.xyt) as Address
  );
  otToken.totalSupply = fetchTokenTotalSupply(
    ByteArray.fromHexString(yieldContract.ot) as Address
  );

  xytToken.save();
  otToken.save();

  // Creating new MintYieldToken entity
  let redeemYieldToken = new RedeemYieldToken(
    event.transaction.hash.toHexString()
  );

  redeemYieldToken.redeemedValueUSD = newRedeenVolumeUSD;

  redeemYieldToken.blockNumber = event.block.number;
  redeemYieldToken.timestamp = event.block.timestamp;

  redeemYieldToken.forgeId = forgeId;
  redeemYieldToken.amountRedeemed = newRedeenVolume;

  redeemYieldToken.amountToRedeem = convertTokenToDecimal(
    event.params.amountToRedeem,
    xytToken.decimals
  );
  redeemYieldToken.expiry = event.params.expiry;
  redeemYieldToken.from = event.transaction.from;
  redeemYieldToken.underlyingAsset = underlyingToken.id;
  redeemYieldToken.yieldBearingAsset = yieldContract.yieldBearingAsset;
  redeemYieldToken.yieldContract = yieldContract.id;
  redeemYieldToken.xytAsset = xytToken.id;
  redeemYieldToken.otAsset = otToken.id;
  redeemYieldToken.save();
}

/* ** PENDLE MARKET FACTORY EVENTS */

export function handleMarketCreated(event: MarketCreatedEvent): void {
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

/*** PENDLE MARKET EVENTS */

/***
 * @dev Updates market reserves and token prices
 *  */
export function handleSync(event: SyncEvent): void {
  let pair = Pair.load(event.address.toHex());
  let token0 = Token.load(pair.token0); // xyt
  let token1 = Token.load(pair.token1); // baseToken
  let marketContract = PendleMarketContract.bind(
    Address.fromHexString(pair.id) as Address
  );

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  pair.totalSupply = marketContract.totalSupply().toBigDecimal();
  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);
  /* Fetches spot price*/

  let xytBalance = event.params.reserve0.toBigDecimal();
  let xytWeight_BI = event.params.weight0;
  let tokenBalance = event.params.reserve1.toBigDecimal();
  let tokenWeight_BI = RONE.minus(xytWeight_BI);

  pair.token0WeightRaw = xytWeight_BI;
  pair.token1WeightRaw = tokenWeight_BI;

  let xytWeight_BD = xytWeight_BI.toBigDecimal();
  let tokenWeight_BD = tokenWeight_BI.toBigDecimal();

  let xytDecimal = token0.decimals;
  let baseDecimal = token1.decimals;

  if (pair.reserve0.notEqual(ZERO_BD) && pair.reserve1.notEqual(ZERO_BD)) {
    let rawXytPrice = tokenBalance
      .times(xytWeight_BD)
      .div(tokenWeight_BD.times(xytBalance));

    let multipledBy = BigInt.fromI32(10).pow(
      xytDecimal.minus(baseDecimal).toI32() as u8
    );

    pair.token0Price = rawXytPrice.times(multipledBy.toBigDecimal());
    pair.token1Price = ONE_BD;
  } else {
    pair.token0Price = ZERO_BD;
    pair.token1Price = ZERO_BD;
  }

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  // save entities
  pair.save();
  token0.save();
  token1.save();
}

/**
 * @dev Handles tracking of joining and exiting liquidity of market
 */
// export function handleTransfer(event: TransferEvent): void {
//   // user stats
//   let from = loadUser(event.params.from);
//   let to = loadUser(event.params.to);

//   let pair = Pair.load(event.address.toHexString());
//   let pairContract = ERC20.bind(event.address);
//   let token = Token.load(event.address.toHexString());
//   let value = convertTokenToDecimal(event.params.value, BI_18);

//   if (token === null) {
//     token = generateNewToken(event.address);
//   }

//   let transactionHash = event.transaction.hash.toHexString();

//   // get or create transaction
//   let transaction = Transaction.load(transactionHash);
//   if (transaction === null) {
//     transaction = new Transaction(transactionHash);
//     transaction.blockNumber = event.block.number;
//     transaction.timestamp = event.block.timestamp;
//     transaction.lpMints = [];
//     transaction.lpBurns = [];
//     transaction.swaps = [];
//     transaction.mintYieldTokens = [];
//     transaction.redeemYieldTokens = [];
//   }

//   /**
//    * @dev User adding liquidity
//    */
//   let mints = transaction.lpMints;
//   if (from.id == ADDRESS_ZERO) {
//     // update total supply
//     pair.totalSupply = pair.totalSupply.plus(value);
//     pair.save();

//     // create new mint if no mints so far
//     if (mints.length === 0) {
//       let mint = new MintLPToken(
//         event.transaction.hash
//           .toHexString()
//           .concat("-")
//           .concat(BigInt.fromI32(mints.length).toString())
//       );
//       mint.transaction = transaction.id;
//       mint.pair = pair.id;
//       mint.to = event.params.to;
//       mint.liquidity = value;
//       mint.timestamp = transaction.timestamp;
//       mint.transaction = transaction.id;
//       mint.save();

//       // update mints in transaction
//       transaction.lpMints = mints.concat([mint.id]);

//       // save entities
//       transaction.save();
//     }

//     let toUserLiquidityPosition = createLiquidityPosition(
//       event.address,
//       event.params.to
//     );
//     toUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(
//       pairContract.balanceOf(event.params.to),
//       BI_18
//     );
//     toUserLiquidityPosition.save();
//     // createLiquiditySnapshot(toUserLiquidityPosition, event, "add", value);
//   }

//   /**
//    * wallet address = 0xE8A4095437dd20a01e66115dE33164eBCEA9B09a
//    * market factory address = 0x2d0DaF52777D6Fd2A7233E693320BF519CFA9B01
//    */

//   /**
//    * @dev User removing liquidity
//    */
//   if (from.id != ADDRESS_ZERO && from.id != pair.id) {
//     // log.debug("handle transfer and sync, this is remove liquidity", []);
//     pair.totalSupply = pair.totalSupply.minus(value);
//     pair.save();
//     let fromUserLiquidityPosition = createLiquidityPosition(
//       event.address,
//       event.params.from
//     );
//     fromUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(
//       pairContract.balanceOf(event.params.from),
//       BI_18
//     );
//     fromUserLiquidityPosition.save();
//     // createLiquiditySnapshot(
//     //   fromUserLiquidityPosition,
//     //   event,
//     //   "remove",
//     //   value.neg()
//     // );
//   }
// }
