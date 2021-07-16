import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  SushiswapPair,
  Token,
  SushiswapPairToOt
} from "../../generated/schema";
import { PairCreated as SushiswapPairCreatedEvent } from "../../generated/SushiswapFactory/SushiswapFactory";
import { getEthPrice, getUniswapAddressPrice } from "../uniswap/pricing";
import {
  ERROR_COMPOUND_SUSHISWAP_PAIR,
  PENDLE_ETH_SUSHISWAP,
  PENDLE_TOKEN_ADDRESS,
  TWO_BD,
  WETH_ADDRESS
} from "../utils/consts";
import { getBalanceOf, loadToken, printDebug } from "../utils/helpers";
import { SushiswapPair as SushiswapPairTemplate } from "../../generated/templates";

export function isOwnershipToken(tokenAddress: Address): Boolean {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null || token.type != "ot") {
    return false as Boolean;
  }
  return true as Boolean;
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
    otMarket.poolAddress = event.params.pair.toHexString();
    otMarket.pendleIncentives = getPendleIncentives(
      Address.fromHexString(otMarket.poolAddress) as Address
    );
    otMarket.save();

    let otMap = new SushiswapPairToOt(otMarket.poolAddress);
    otMap.otAddress = otMarket.id;
    otMap.save();
  }
}

export function updateSushiswapPair(
  otAddress: Address,
  timestamp: BigInt
): void {
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

  printDebug(getPendlePrice().toString(), "pendle-price");
}

export function handleUpdateSushiswap(event: ethereum.Event): void {
  let otMap = SushiswapPairToOt.load(event.address.toHexString());
  let otAddress = Address.fromHexString(otMap.otAddress);
  updateSushiswapPair(otAddress as Address, event.block.timestamp);
}

export function getPendlePrice(): BigDecimal {
  let pendleBalance = getBalanceOf(PENDLE_TOKEN_ADDRESS, PENDLE_ETH_SUSHISWAP);
  let wethBalance = getBalanceOf(WETH_ADDRESS, PENDLE_ETH_SUSHISWAP);
  let wethPrice = getEthPrice();
  return wethPrice.times(wethBalance).div(pendleBalance);
}

export function getPendleIncentives(poolAddress: Address): BigDecimal {
  if (
    poolAddress.toHexString() == "0x0d8a21f2ea15269B7470c347083ee1f85e6A723b"
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
  return BigDecimal.fromString("0");
}
