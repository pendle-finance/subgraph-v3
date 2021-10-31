import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Pair, PairHourData, Token, PairDailyData } from "../generated/schema";
import { getTokenPrice } from "./pricing";
import {
  DAYS_PER_YEAR_BD,
  ONE_BD,
  ONE_BI,
  ONE_DAY,
  ONE_HOUR,
  ZERO_BD,
  ZERO_BI
} from "./utils/consts";
import {
  calcMarketWorthUSD,
  calcYieldTokenPrice,
  printDebug
} from "./utils/helpers";

export function updatePairHourData(
  _timestamp: BigInt,
  market: Pair
): PairHourData {
  let timestamp = _timestamp.toI32();
  let hourID = timestamp / ONE_HOUR;
  let hourStartUnix = hourID * ONE_HOUR;
  let hourPairID = market.id
    .concat("-")
    .concat(BigInt.fromI32(hourID).toString());

  let pairHourData = PairHourData.load(hourPairID);
  let currentYieldTokenPrice = calcYieldTokenPrice(market);

  if (pairHourData === null) {
    pairHourData = new PairHourData(hourPairID);
    pairHourData.hourStartUnix = hourStartUnix;
    pairHourData.pair = market.id;
    pairHourData.hourlyVolumeToken0 = ZERO_BD;
    pairHourData.hourlyVolumeToken1 = ZERO_BD;
    pairHourData.hourlyVolumeUSD = ZERO_BD;
    pairHourData.hourlyTxns = BigInt.fromI32(0);
    // YIELD TOKEN price
    pairHourData.yieldTokenPrice_low = currentYieldTokenPrice;
    pairHourData.yieldTokenPrice_high = currentYieldTokenPrice;
    pairHourData.yieldTokenPrice_open = currentYieldTokenPrice;

    // BASE TOKEN price
    let baseToken = Token.load(market.token1);
    pairHourData.baseTokenPrice = getTokenPrice(baseToken as Token);

    // Underlying price
    let yieldToken = Token.load(market.token0);
    let yieldBearingToken = Token.load(yieldToken.underlyingAsset);
    pairHourData.yieldBearingAssetPrice = getTokenPrice(
      yieldBearingToken as Token
    );
  }

  // update yield token prices
  if (currentYieldTokenPrice.gt(pairHourData.yieldTokenPrice_high)) {
    pairHourData.yieldTokenPrice_high = currentYieldTokenPrice;
  }
  if (currentYieldTokenPrice.lt(pairHourData.yieldTokenPrice_low)) {
    pairHourData.yieldTokenPrice_low = currentYieldTokenPrice;
  }
  pairHourData.yieldTokenPrice_close = currentYieldTokenPrice;

  // calculate annual yield percentage
  let yieldTokenPriceUSD = currentYieldTokenPrice.times(
    pairHourData.baseTokenPrice
  );

  let daysUntilExpiry = market.expiry
    .toBigDecimal()
    .minus(_timestamp.toBigDecimal())
    .div(ONE_DAY);
  log.debug("_timestamp: %s, ONE_DAY: %s", [
    _timestamp.toString(),
    ONE_DAY.toString()
  ]);
  log.debug("yieldTokenPriceUSD: %s, pairHourData.yieldBearingAssetPrice: %s", [
    yieldTokenPriceUSD.toString(),
    pairHourData.yieldBearingAssetPrice.toString()
  ]);
  let impliedYieldPercentage = yieldTokenPriceUSD
    .div(pairHourData.yieldBearingAssetPrice.minus(yieldTokenPriceUSD))
    .div(daysUntilExpiry)
    .times(DAYS_PER_YEAR_BD);

  pairHourData.impliedYield = impliedYieldPercentage;
  pairHourData.marketWorthUSD = calcMarketWorthUSD(market);
  pairHourData.lpTokenPrice = ZERO_BD;
  pairHourData.totalSupply = market.totalSupply;
  pairHourData.reserve0 = market.reserve0;
  pairHourData.reserve1 = market.reserve1;

  log.debug("pairHourData.marketWorthUSD: %s, market.totalSupply: %s", [
    pairHourData.marketWorthUSD.toString(),
    market.totalSupply.toString()
  ]);

  // pairHourData.marketWorthUSD.div(
  //   pairHourData.totalSupply
  // );
  pairHourData.save();
  return pairHourData as PairHourData;
}

export function updatePairDailyData(
  _timestamp: BigInt,
  market: Pair
): PairDailyData {
  let timestamp = _timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartUnix = dayID * 86400;
  let dayPairID = market.id
    .concat("-")
    .concat(BigInt.fromI32(dayID).toString());

  let currentYieldTokenPrice = calcYieldTokenPrice(market);

  let pairDayData = PairDailyData.load(dayPairID);
  if (pairDayData == null) {
    pairDayData = new PairDailyData(dayPairID);
    pairDayData.dayStartUnix = dayStartUnix;
    pairDayData.pair = market.id;
    pairDayData.dailyVolumeToken0 = ZERO_BD;
    pairDayData.dailyVolumeToken1 = ZERO_BD;
    pairDayData.dailyVolumeUSD = ZERO_BD;
    pairDayData.dailyTxns = ZERO_BI;

    // Yield TOKEN PRICE
    pairDayData.yieldTokenPrice_low = currentYieldTokenPrice;
    pairDayData.yieldTokenPrice_high = currentYieldTokenPrice;
    pairDayData.yieldTokenPrice_open = currentYieldTokenPrice;

    // Base Token price
    let baseToken = Token.load(market.token1);
    pairDayData.baseTokenPrice = getTokenPrice(baseToken as Token);

    // Underlying price
    let yieldToken = Token.load(market.token0);
    let yieldBearingToken = Token.load(yieldToken.underlyingAsset);
    pairDayData.yieldBearingAssetPrice = getTokenPrice(
      yieldBearingToken as Token
    );
  }

  // update yield token prices
  if (currentYieldTokenPrice.gt(pairDayData.yieldTokenPrice_high)) {
    pairDayData.yieldTokenPrice_high = currentYieldTokenPrice;
  }
  if (currentYieldTokenPrice.lt(pairDayData.yieldTokenPrice_low)) {
    pairDayData.yieldTokenPrice_low = currentYieldTokenPrice;
  }
  pairDayData.yieldTokenPrice_close = currentYieldTokenPrice;

  // calculate annual yield percentage
  let yieldTokenPriceUSD = currentYieldTokenPrice.times(
    pairDayData.baseTokenPrice
  );

  let daysUntilExpiry = market.expiry
    .toBigDecimal()
    .minus(_timestamp.toBigDecimal())
    .div(ONE_DAY);

  let impliedYieldPercentage = yieldTokenPriceUSD
    .div(pairDayData.yieldBearingAssetPrice.minus(yieldTokenPriceUSD))
    .div(daysUntilExpiry)
    .times(DAYS_PER_YEAR_BD);

  pairDayData.impliedYield = impliedYieldPercentage;
  pairDayData.reserve0 = market.reserve0;
  pairDayData.reserve1 = market.reserve1;
  pairDayData.marketWorthUSD = calcMarketWorthUSD(market);
  pairDayData.totalSupply = market.totalSupply;
  pairDayData.lpTokenPrice = pairDayData.marketWorthUSD.div(
    pairDayData.totalSupply
  );
  pairDayData.save();
  return pairDayData as PairDailyData;
}

export function addHourlyDailyTxn(_timestamp: BigInt, market: Pair): void {
  let pairHourData = updatePairHourData(_timestamp, market);
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
  let pairDailyData = updatePairDailyData(_timestamp, market);
  pairDailyData.dailyTxns = pairDailyData.dailyTxns.plus(ONE_BI);
}

export function addHourlyDailyVolume(
  _timestamp: BigInt,
  market: Pair,
  token0Amount: BigDecimal,
  token1Amount: BigDecimal,
  volumeUSD: BigDecimal
): void {
  let pairHourData = updatePairHourData(_timestamp, market);
  pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
    token0Amount
  );
  pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
    token1Amount
  );
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(volumeUSD);

  let pairDailyData = updatePairDailyData(_timestamp, market);
  pairDailyData.dailyVolumeToken0 = pairDailyData.dailyVolumeToken0.plus(
    token0Amount
  );
  pairDailyData.dailyVolumeToken1 = pairDailyData.dailyVolumeToken1.plus(
    token1Amount
  );
  pairDailyData.dailyVolumeUSD = pairDailyData.dailyVolumeUSD.plus(volumeUSD);
}
