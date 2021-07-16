import {
  Address,
  BigDecimal,
  BigInt,
  ethereum,
  log
} from "@graphprotocol/graph-ts";
import { Pair, PairHourData, Token } from "../generated/schema";
import { getUniswapTokenPrice } from "./uniswap/pricing";
import {
  DAYS_PER_YEAR_BD,
  ONE_BD,
  ONE_DAY,
  ONE_HOUR,
  ZERO_BD
} from "./utils/consts";
import {
  calcMarketWorthUSD,
  calcYieldTokenPrice,
  printDebug
} from "./utils/helpers";

export function updatePairHourData(
  event: ethereum.Event,
  market: Pair
): PairHourData {
  let timestamp = event.block.timestamp.toI32();
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
    pairHourData.baseTokenPrice = getUniswapTokenPrice(baseToken as Token);

    // Underlying price
    let yieldToken = Token.load(market.token0);
    let yieldBearingToken = Token.load(yieldToken.underlyingAsset);
    pairHourData.yieldBearingAssetPrice = getUniswapTokenPrice(
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
    .minus(event.block.timestamp.toBigDecimal())
    .div(ONE_DAY);

  let impliedYieldPercentage = yieldTokenPriceUSD
    .div(pairHourData.yieldBearingAssetPrice.minus(yieldTokenPriceUSD))
    .div(daysUntilExpiry)
    .times(DAYS_PER_YEAR_BD);

  pairHourData.impliedYield = impliedYieldPercentage;
  pairHourData.reserve0 = market.reserve0;
  pairHourData.reserve1 = market.reserve1;
  pairHourData.marketWorthUSD = calcMarketWorthUSD(market);
  pairHourData.save();
  return pairHourData as PairHourData;
}
