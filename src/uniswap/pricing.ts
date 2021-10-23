import { Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import { UniswapPool as UniswapPoolContract } from "../../generated/UniswapFactory/UniswapPool";
import { exponentToBigDecimal, printDebug } from "../utils/helpers";
import { getUniswapPoolAddress } from "./factory";
import {
  WETH_ADDRESS,
  USDC_WETH_POOL,
  UNISWAP_Q192,
  ONE_BD,
  STABLE_USD_TOKENS,
  ZERO_BD,
} from "../utils/consts";
import { loadToken } from "../utils/load-entity";

export function getPoolPrice(
  poolAddress: Address,
  inToken: Address
): BigDecimal {
  let poolContract = UniswapPoolContract.bind(poolAddress);
  let token0Response = poolContract.try_token0();

  if (token0Response.reverted) {
    printDebug(
      "Uniswap Pool Contract try_token0 reverted:",
      "type"
    );
    return ZERO_BD;
  }

  let token0Address = token0Response.value as Address;
  let token1Address = poolContract.token1();
  let token0Decimals = exponentToBigDecimal(loadToken(token0Address).decimals);
  let token1Decimals = exponentToBigDecimal(loadToken(token1Address).decimals);

  let poolState = poolContract.slot0().value0.toBigDecimal();
  let price0 = poolState
    .times(poolState)
    .div(UNISWAP_Q192)
    .times(token0Decimals)
    .div(token1Decimals);

  if (inToken.toString() == token0Address.toString()) {
    return price0;
  } else {
    return ONE_BD.div(price0);
  }
}

export function getUniswapEthPrice(): BigDecimal {
  return getPoolPrice(USDC_WETH_POOL, WETH_ADDRESS);
}

export function getUniswapTokenPrice(tokenAddress: Address): BigDecimal {
  let poolAddress = getUniswapPoolAddress(tokenAddress, WETH_ADDRESS);
  if (poolAddress) {
    // tokenPrice = token/eth * eth price
    return getPoolPrice(poolAddress, tokenAddress).times(getUniswapEthPrice());
  } else {
    for (let i = 0; i < STABLE_USD_TOKENS.length; ++i) {
      let usdToken = STABLE_USD_TOKENS[i];
      let poolAddress = getUniswapPoolAddress(tokenAddress, usdToken);
      if (poolAddress) {
        return getPoolPrice(poolAddress, tokenAddress);
      }
    }
  }
  return BigDecimal.fromString("0");
}
