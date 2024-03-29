import { log, BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../generated/templates/PendleMarket/ERC20";
import {
  Token,
  Pair,
  DebugLog,
  PendleData,
  LiquidityMining
} from "../../generated/schema";
import { PendleMarket as PendleMarketContract } from "../../generated/templates/PendleMarket/PendleMarket";
import {
  ONE_BD,
  ONE_BI,
  RONE,
  RONE_BD,
  TWO_BD,
  ZERO_BD,
  ZERO_BI
} from "./consts";
import { getUniswapTokenPrice } from "../uniswap/pricing";
import { SushiswapPair } from "../../generated/templates/SushiswapPair/SushiswapPair";
import { loadToken } from "./load-entity";

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function calcLpPrice(
  marketAddress: Address,
  baseTokenAddress: string,
  baseTokenAmount: BigInt,
  lpAmount: BigDecimal,
  isJoin: boolean
): BigDecimal {
  let marketContract = PendleMarketContract.bind(marketAddress);
  let baseToken = Token.load(baseTokenAddress);
  let reserves = marketContract.getReserves();
  let tokenBalance = reserves.value2;
  let tokenWeight = reserves.value3;

  let totalLpSupply = marketContract.totalSupply().toBigDecimal();

  if (isJoin) {
    totalLpSupply = totalLpSupply.plus(lpAmount);
    tokenBalance = tokenBalance.plus(baseTokenAmount);
  } else {
    totalLpSupply = totalLpSupply.minus(lpAmount);
    tokenBalance = tokenBalance.minus(baseTokenAmount);
  }

  //@TODO Fetch proper base token price
  let priceOfBaseToken = getUniswapTokenPrice(baseToken as Token);
  let totalValueOfBaseToken = priceOfBaseToken
    .times(tokenBalance.toBigDecimal())
    .div(exponentToBigDecimal(baseToken.decimals));
  let baseTokenWeight = tokenWeight.toBigDecimal().div(RONE.toBigDecimal());
  let lpPrice = totalValueOfBaseToken.div(baseTokenWeight).div(totalLpSupply);
  return lpPrice;
}

export function calcMarketWorthUSD(market: Pair): BigDecimal {
  let baseToken = Token.load(market.token1);
  let baseTokenWeight = market.token1WeightRaw.toBigDecimal().div(RONE_BD);
  let baseTokenBalance = market.reserve1;
  let baseTokenPrice = getUniswapTokenPrice(baseToken as Token);
  let marketWorthUSD = baseTokenBalance
    .times(baseTokenPrice)
    .div(baseTokenWeight);
  return marketWorthUSD;
}

export function calcYieldTokenPrice(market: Pair): BigDecimal {
  // Load 2 tokens
  let baseToken = Token.load(market.token1);
  // Token weights
  let baseTokenWeight = market.token1WeightRaw.toBigDecimal().div(RONE_BD);
  let yieldTokenWeight = ONE_BD.minus(baseTokenWeight);
  // Token balances
  let baseTokenBalance = market.reserve1;
  let yieldTokenBalance = market.reserve0;
  // Finalize answer
  let marketWorth = baseTokenBalance
    .times(getUniswapTokenPrice(baseToken as Token))
    .div(baseTokenWeight);
  let yieldTokenPrice = marketWorth
    .times(yieldTokenWeight)
    .div(yieldTokenBalance);
  return yieldTokenPrice;
}

export function getBalanceOf(
  tokenAddress: Address,
  ofAddress: Address
): BigDecimal {
  let token = loadToken(tokenAddress);
  let tokenContract = ERC20.bind(tokenAddress);
  return convertTokenToDecimal(
    tokenContract.balanceOf(ofAddress),
    token.decimals
  );
}

export function printDebug(message: string, type: string): void {
  let id = "";
  let root = DebugLog.load("0");
  if (root == null) {
    id = "0";
  } else {
    root.length = root.length.plus(ONE_BI);
    root.save();
    id = root.length.toString();
  }

  let debugInstance = new DebugLog(id);
  debugInstance.message = message;
  debugInstance.type = type;
  debugInstance.length = ZERO_BI;
  debugInstance.save();

  log.debug("{} | {}", [type, message]);
}

export function loadPendleData(): PendleData {
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

export function isMarketLiquidityMiningV2(marketAddress: Address): boolean {
  let lm = LiquidityMining.load(marketAddress.toHexString());
  if (lm == null) return false;
  return true;
}

export function getLpPrice(market: Pair): BigDecimal {
  return market.reserveUSD.div(market.totalSupply);
}

export function getSushiLpPrice(lpAddress: Address): BigDecimal {
  let sushiContract = SushiswapPair.bind(lpAddress);
  let totalSupply = convertTokenToDecimal(
    sushiContract.totalSupply(),
    loadToken(lpAddress).decimals
  );
  let token = loadToken(sushiContract.token0());
  let tokenPrice = getUniswapTokenPrice(token as Token);
  let tokenBalance = convertTokenToDecimal(
    sushiContract.getReserves().value0,
    token.decimals
  );
  return tokenBalance
    .times(tokenPrice)
    .times(TWO_BD)
    .div(totalSupply);
}
