import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { QuickswapPair } from "../../generated/PendleRouter/QuickswapPair";
import {
  ONE_BD,
  STABLE_USD_TOKENS,
  TIME_ADDRESS,
  WETH_ADDRESS,
  WMATIC_ADDRESS,
  ZERO_BD,
} from "../utils/consts";
import { getBalanceOf, printDebug } from "../utils/helpers";
import { getQuickswapPairAddress } from "./factory";

/**
 * @param poolAddress
 * @param token0
 * @returns trading ratio between token0 and token1
 */

export function getPoolPrice(
  poolAddress: Address,
  token0: Address
): BigDecimal {
  let poolContract = QuickswapPair.bind(poolAddress);
  let token1 = poolContract.token1();
  if (token0.toHexString() == token1.toHexString()) {
    let response = poolContract.try_token0();

    if (response.reverted) {
      printDebug(
        "Pool Contract try_token0 reverted: " + poolAddress.toHexString(),
        "error"
      );
      return ZERO_BD;
    }

    token1 = response.value;
  }
  let balance0 = getBalanceOf(token0, poolAddress);
  let balance1 = getBalanceOf(token1, poolAddress);
  return balance1.div(balance0);
}

/**
 * @returns the price of matic (average from MATIC/USDC, MATIC/DAI, MATIC/USDT)
 */
export function getQuickSwapMaticPrice(): BigDecimal {
  let sumPrice = ZERO_BD;
  for (let i = 0; i < STABLE_USD_TOKENS.length; ++i) {
    let usd = STABLE_USD_TOKENS[i];
    let pool = getQuickswapPairAddress(WMATIC_ADDRESS, usd);
    sumPrice = sumPrice.plus(getPoolPrice(pool, WMATIC_ADDRESS));
  }
  return sumPrice.div(BigDecimal.fromString("3"));
}

/**
 * @returns the price of eth (based on MATIC/ETH pool)
 */
export function getQuickSwapEthPrice(): BigDecimal {
  let pool = getQuickswapPairAddress(WMATIC_ADDRESS, WETH_ADDRESS);
  return getPoolPrice(pool, WETH_ADDRESS).times(getQuickSwapMaticPrice());
}

/**
 *
 * @param tokenAddress
 * @returns the price of the token base on:
 *  1. If theres a token/matic pool, return base on the rate and price of matic at the time
 *  2. If theres a token/eth pool, return base on the rate and price of eth at the time
 *  3. If theres a stable coin/token pool, return the base on the rate at that time
 *
 *  Currently we dont want to implement the second phase, since we are not watching quickswap factory but rather hardcodes some pairs.
 */
export function getQuickSwapTokenPrice(tokenAddress: Address): BigDecimal {
  if (tokenAddress.equals(TIME_ADDRESS)) {
    return getPoolPrice(
      getQuickswapPairAddress(TIME_ADDRESS, STABLE_USD_TOKENS[3]),
      TIME_ADDRESS
    );
  }

  let poolAddress = getQuickswapPairAddress(tokenAddress, WMATIC_ADDRESS);
  if (poolAddress) {
    return getPoolPrice(poolAddress, tokenAddress).times(
      getQuickSwapMaticPrice()
    );
  } else {
    for (let i = 0; i < STABLE_USD_TOKENS.length; ++i) {
      let usd = STABLE_USD_TOKENS[i];
      let poolAddress = getQuickswapPairAddress(usd, tokenAddress);
      if (poolAddress) {
        return getPoolPrice(poolAddress, tokenAddress);
      }
    }
  }
  return ZERO_BD;
}
