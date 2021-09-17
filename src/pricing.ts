import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { Token } from "../generated/schema";
import { ICToken as ICTokenContract } from "../generated/templates/IPendleForge/ICToken";
import { getQuickSwapTokenPrice } from "./quickswap/pricing";
import { getPendlePrice, getSushiLpPrice } from "./sushiswap/pricing";
import { getUniswapTokenPrice } from "./uniswap/pricing";
import {
  chainId,
  COMPOUND_EXCHANGE_RATE_DECIMAL,
  getHardcodedPrice,
  PENDLE_TOKEN_ADDRESS,
  ZERO_BD
} from "./utils/consts";
import { exponentToBigDecimal, printDebug } from "./utils/helpers";
import { loadToken } from "./utils/load-entity";

export function getCTokenCurrentRate(token: Token): BigDecimal {
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

function calcSpecialForgePrice(
  token: Token,
  underlyingPrice: BigDecimal
): BigDecimal {
  let tokenPrice = underlyingPrice;
  if (token.forgeId.startsWith("Compound")) {
    tokenPrice = underlyingPrice.times(getCTokenCurrentRate(token as Token));
  }
  if (token.forgeId.startsWith("Aave")) {
    // Currently we just leave 1 token = 1 aave token
    tokenPrice = underlyingPrice;
  }
  return tokenPrice;
}

/**
 *
 * This function will be divided into 3 parts
 *
 * P1: Check for independent forge (Sushi LP, Uniswap LP,...)
 * P2: Get rid of the yield bearing part and find underlying asset price
 * P3: Check for special yield bearing price (Compound, Aave,...)
 *
 * @param token
 * @returns price of token
 */
export function getTokenPrice(token: Token): BigDecimal {
  if (token.id == PENDLE_TOKEN_ADDRESS.toHexString()) {
    return getPendlePrice();
  }

  let underlyingPrice = ZERO_BD;
  let isYieldBearingToken = token.underlyingAsset !== null;
  let underlyingAsset = Address.fromHexString(
    isYieldBearingToken ? token.underlyingAsset : token.id
  ) as Address;

  /* forges not depending on network */
  if (token.forgeId.startsWith("Sushi")) {
    underlyingPrice = getSushiLpPrice(underlyingAsset);
    return underlyingPrice;
  }

  switch (chainId) {
    case 1: {
      // Mainnet
      underlyingPrice = getUniswapTokenPrice(underlyingAsset);
      break;
    }
    case 42: {
      // Kovan
      underlyingPrice = getHardcodedPrice(underlyingAsset);
      break;
    }
    case 137: {
      // Polygon
      underlyingPrice = getQuickSwapTokenPrice(underlyingAsset);
      break;
    }
  }
  if (isYieldBearingToken) {
    return calcSpecialForgePrice(token, underlyingPrice);
  } else {
    return underlyingPrice;
  }
}
