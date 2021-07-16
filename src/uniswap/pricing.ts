import { Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { ICToken as ICTokenContract } from "../../generated/templates/IPendleForge/ICToken";
import { UniswapPool as UniswapPoolContract } from "../../generated/UniswapFactory/UniswapPool";
import { exponentToBigDecimal, loadToken } from "../utils/helpers";
import { getUniswapPoolAddress } from "./factory";
import {
  COMPOUND_EXCHANGE_RATE_DECIMAL,
  WETH_ADDRESS,
  USDC_WETH_03_POOL,
  UNISWAP_Q192,
  ONE_BD,
  STABLE_USD_TOKENS
} from "../utils/consts";

// @TODO: move these things to compound folder
export function getCTokenCurrentRate(token: Token | null): BigDecimal {
  let tokenAddress = Address.fromHexString(token.id) as Address;
  let underlyingAssetAddress = Address.fromHexString(
    token.underlyingAsset
  ) as Address;
  let underlyingAsset = loadToken(underlyingAssetAddress);

  let cTokenContract = ICTokenContract.bind(tokenAddress);
  return cTokenContract
    .exchangeRateCurrent()
    .toBigDecimal()
    .div(COMPOUND_EXCHANGE_RATE_DECIMAL)
    .div(exponentToBigDecimal(underlyingAsset.decimals.minus(token.decimals)));
}

export function getPoolPrice(
  poolAddress: Address,
  inToken: Address
): BigDecimal {
  let poolContract = UniswapPoolContract.bind(poolAddress);

  let token0Address = poolContract.token0();
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

export function getEthPrice(): BigDecimal {
  return getPoolPrice(USDC_WETH_03_POOL, WETH_ADDRESS);
}

export function getUnderlyingPrice(tokenAddress: Address): BigDecimal {
  let poolAddress = getUniswapPoolAddress(tokenAddress, WETH_ADDRESS);
  if (poolAddress) {
    // tokenPrice = token/eth * eth price
    return getPoolPrice(poolAddress, tokenAddress).times(getEthPrice());
  } else {
    // try find a pool with stable usd coin
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

export function getUniswapTokenPrice(token: Token): BigDecimal {
  let isYieldBearingToken = token.underlyingAsset != null;
  let tokenHexString = isYieldBearingToken ? token.underlyingAsset : token.id;
  let tokenAddress = Address.fromHexString(tokenHexString) as Address;
  let tokenPrice = getUnderlyingPrice(tokenAddress);

  // When there are new forges, you will need to hardcode their formulas yourself
  if (isYieldBearingToken) {
    if (token.forgeId.startsWith("Compound")) {
      tokenPrice = tokenPrice.times(getCTokenCurrentRate(token));
    }
    if (token.forgeId.startsWith("Aave")) {
      // Currently we just leave 1 token = 1 aave token
    }
  }
  return tokenPrice;
}

export function getUniswapAddressPrice(tokenAddress: Address): BigDecimal {
  let token = loadToken(tokenAddress);
  return getUniswapTokenPrice(token as Token);
}
