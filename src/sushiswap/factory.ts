import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  SushiswapPair,
  Token,
  SushiswapPairToOt,
  SushiswapPairHourData
} from "../../generated/schema";
import { PairCreated as SushiswapPairCreatedEvent } from "../../generated/SushiswapFactory/SushiswapFactory";
import { Swap as SwapEvent } from "../../generated/SushiswapFactory/SushiswapPair";
import {
  getEthPrice,
  getUniswapAddressPrice,
  getUniswapTokenPrice
} from "../uniswap/pricing";
import {
  ERROR_COMPOUND_SUSHISWAP_PAIR,
  ONE_HOUR,
  PENDLE_ETH_SUSHISWAP,
  PENDLE_TOKEN_ADDRESS,
  TWO_BD,
  WETH_ADDRESS,
  ZERO_BD
} from "../utils/consts";
import {
  convertTokenToDecimal,
  getBalanceOf,
  loadToken,
  printDebug
} from "../utils/helpers";
import { SushiswapPair as SushiswapPairTemplate } from "../../generated/templates";

export function isOwnershipToken(tokenAddress: Address): boolean {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null || token.type != "ot") {
    return false as boolean;
  }
  return true as boolean;
}

export function handleNewSushiswapPair(event: SushiswapPairCreatedEvent): void {
  // skip error compound pair
  if (event.params.pair.toHexString() == ERROR_COMPOUND_SUSHISWAP_PAIR) {
    return;
  }

  let id = "";
  let baseToken = "";
  if (isOwnershipToken(event.params.token0)) {
    id = event.params.token0.toHexString();
    baseToken = event.params.token1.toHexString();
  }
  if (isOwnershipToken(event.params.token1)) {
    id = event.params.token1.toHexString();
    baseToken = event.params.token0.toHexString();
  }
  if (id != "") {
    // OT Market found
    SushiswapPairTemplate.create(event.params.pair);
    let otMarket = new SushiswapPair(id);
    otMarket.baseToken = baseToken;

    otMarket.isOtToken0 = isOwnershipToken(event.params.token0);

    otMarket.totalTradingUSD = ZERO_BD;
    otMarket.poolAddress = event.params.pair.toHexString();
    otMarket.pendleIncentives = getPendleIncentives(
      Address.fromHexString(otMarket.poolAddress) as Address
    );
    otMarket.save();
    updateSushiswapPair(
      Address.fromHexString(otMarket.id) as Address,
      event.block.timestamp
    );

    let otMap = new SushiswapPairToOt(otMarket.poolAddress);
    otMap.otAddress = otMarket.id;
    otMap.save();
  }
}

export function updateSushiswapPair(
  otAddress: Address,
  timestamp: BigInt
): SushiswapPair {
  let pair = SushiswapPair.load(otAddress.toHexString());
  let pairAddress = Address.fromHexString(pair.poolAddress);
  let baseTokenAddress = Address.fromHexString(pair.baseToken);
  let otBalance = getBalanceOf(otAddress as Address, pairAddress as Address);
  let baseTokenBalance = getBalanceOf(
    baseTokenAddress as Address,
    pairAddress as Address
  );
  let baseTokenPrice = getUniswapAddressPrice(baseTokenAddress as Address);
  let marketWorth = baseTokenPrice.times(baseTokenBalance).times(TWO_BD);

  let otPrice = marketWorth.div(TWO_BD).div(otBalance);
  pair.baseTokenPrice = baseTokenPrice;
  pair.updatedAt = timestamp;
  pair.marketWorthUSD = marketWorth;
  pair.baseTokenBalance = baseTokenBalance;
  pair.otBalance = otBalance;
  pair.otPrice = otPrice;
  pair.aprPercentage = pair.pendleIncentives
    .times(getPendlePrice())
    .div(marketWorth)
    .div(BigDecimal.fromString("7")) // ONE WEEK
    .times(BigDecimal.fromString("365")) // ONE YEAR
    .times(BigDecimal.fromString("100"));
  pair.save();

  return pair as SushiswapPair;
}

export function getPendlePrice(): BigDecimal {
  let pendleBalance = getBalanceOf(PENDLE_TOKEN_ADDRESS, PENDLE_ETH_SUSHISWAP);
  let wethBalance = getBalanceOf(WETH_ADDRESS, PENDLE_ETH_SUSHISWAP);
  let wethPrice = getEthPrice();
  return wethPrice.times(wethBalance).div(pendleBalance);
}

export function getPendleIncentives(poolAddress: Address): BigDecimal {
  if (
    poolAddress.toHexString() == "0x0d8a21f2ea15269b7470c347083ee1f85e6a723b"
  ) {
    return BigDecimal.fromString("90000");
  }
  if (
    poolAddress.toHexString() == "0x4556c4488cc16d5e9552cc1a99a529c1392e4fe9"
  ) {
    return BigDecimal.fromString("90000");
  }
  if (
    poolAddress.toHexString() == "0x8b758d7fd0fc58fca8caa5e53af2c7da5f5f8de1"
  ) {
    return BigDecimal.fromString("10000");
  }
  if (
    poolAddress.toHexString() == "0x2c80d72af9ab0bb9d98f607c817c6f512dd647e6"
  ) {
    return BigDecimal.fromString("7000");
  }
  return BigDecimal.fromString("0");
}

export function handleSwapSushiswap(event: SwapEvent): void {
  let otMap = SushiswapPairToOt.load(event.address.toHexString());
  let otAddress = Address.fromHexString(otMap.otAddress);
  let pair = updateSushiswapPair(otAddress as Address, event.block.timestamp);
  let baseToken = loadToken(
    Address.fromHexString(pair.baseToken) as Address
  ) as Token;

  let tradingValue = ZERO_BD;
  if (pair.isOtToken0) {
    tradingValue = convertTokenToDecimal(
      event.params.amount1In.plus(event.params.amount1Out),
      baseToken.decimals
    );
  } else {
    tradingValue = convertTokenToDecimal(
      event.params.amount0In.plus(event.params.amount0Out),
      baseToken.decimals
    );
  }

  tradingValue = tradingValue.times(getUniswapTokenPrice(baseToken));

  let timestamp = event.block.timestamp.toI32();
  let hourID = timestamp / ONE_HOUR;
  let hourStartUnix = hourID * ONE_HOUR;
  let hourPairID = pair.id
    .concat("-")
    .concat(BigInt.fromI32(hourID).toString());

  let sushiswapPairHourData = SushiswapPairHourData.load(hourPairID);

  if (sushiswapPairHourData === null) {
    sushiswapPairHourData = new SushiswapPairHourData(hourPairID);
    sushiswapPairHourData.otAddress = pair.id;
    sushiswapPairHourData.tradingVolumeUSD = ZERO_BD;
    sushiswapPairHourData.hourStartUnix = hourStartUnix;
    sushiswapPairHourData.poolAddress = pair.poolAddress;
  }

  pair.totalTradingUSD = pair.totalTradingUSD.plus(tradingValue);
  sushiswapPairHourData.tradingVolumeUSD = sushiswapPairHourData.tradingVolumeUSD.plus(
    tradingValue
  );
  pair.save();
  sushiswapPairHourData.save();
  return;
}

export function handleUpdateSushiswap(event: SwapEvent): void {
  let otMap = SushiswapPairToOt.load(event.address.toHexString());
  let otAddress = Address.fromHexString(otMap.otAddress);
  let pair = updateSushiswapPair(otAddress as Address, event.block.timestamp);
  return;
}
