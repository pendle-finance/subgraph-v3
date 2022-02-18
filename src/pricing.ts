import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Token } from "../generated/schema";
import { ICToken as ICTokenContract } from "../generated/templates/IPendleForge/ICToken";
import { ERC20 as ERC20Contract } from "../generated/templates/PendleMarket/ERC20";
import { WMEMO } from "../generated/PendleRouter/WMEMO";
import { IWXBTRFLY } from "../generated/PendleRouter/IWXBTRFLY";
import { getQuickSwapTokenPrice } from "./quickswap/pricing";
import { getPendlePrice, getSushiLpPrice } from "./sushiswap/pricing";
import { getUniswapTokenPrice } from "./uniswap/pricing";
import {
  chainId,
  COMPOUND_EXCHANGE_RATE_DECIMAL,
  getHardcodedPrice,
  ONE_BD,
  PENDLE_TOKEN_ADDRESS,
  WMEMO_ADDRESS,
  WXBTRFLY_ADDRESS,
  ZERO_BD,
} from "./utils/consts";
import { exponentToBigDecimal } from "./utils/helpers";
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

function getxJoeRate(token: Token): BigDecimal {
  let xJoeAddress = Address.fromHexString(token.id) as Address;
  let xJoeToken = ERC20Contract.bind(xJoeAddress);
  let joeToken = ERC20Contract.bind(
    Address.fromHexString(token.underlyingAsset) as Address
  );

  let xJoeTotalSupply = xJoeToken.totalSupply().toBigDecimal();
  let joeBalance = joeToken.balanceOf(xJoeAddress).toBigDecimal();

  let rate = xJoeTotalSupply.div(joeBalance);

  return rate;
}

function calcSpecialForgePrice(
  token: Token,
  underlyingPrice: BigDecimal
): BigDecimal {
  let tokenPrice = underlyingPrice;
  if (token.forgeId.startsWith("xJoe")) {
    tokenPrice = underlyingPrice.times(getxJoeRate(token as Token));
  }

  if (
    token.forgeId.startsWith("Compound") ||
    token.forgeId.startsWith("BenQi")
  ) {
    tokenPrice = underlyingPrice.times(getCTokenCurrentRate(token as Token));
  }
  if (token.forgeId.startsWith("Aave")) {
    // Currently we just leave 1 token = 1 aave token
    tokenPrice = underlyingPrice;
  }

  if (token.forgeId.startsWith("Wonderland")) {
    let WMEMOContract = WMEMO.bind(WMEMO_ADDRESS);
    return tokenPrice.div(
      WMEMOContract.MEMOTowMEMO(BigInt.fromI32(10).pow(9))
        .toBigDecimal()
        .div(exponentToBigDecimal(BigInt.fromI32(18)))
    );
  }

  if (token.forgeId.startsWith("Butterfly")) {
    let WXBTRFLYContract = IWXBTRFLY.bind(WXBTRFLY_ADDRESS);
    return tokenPrice.div(
      WXBTRFLYContract.xBTRFLYValue(BigInt.fromI32(10).pow(9))
        .toBigDecimal()
        .div(exponentToBigDecimal(BigInt.fromI32(18)))
    );
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
  let isYieldBearingToken = token.underlyingAsset != null;
  let underlyingAsset = Address.fromHexString(
    isYieldBearingToken ? token.underlyingAsset : token.id
  ) as Address;

  /* forges not depending on network */
  if (
    token.forgeId.startsWith("Sushi") ||
    token.forgeId.startsWith("TraderJoe")
  ) {
    underlyingPrice = getSushiLpPrice(underlyingAsset);
    return underlyingPrice;
  }

  if (token.forgeId.startsWith("Wonderland")) {
    // underlying is always TIME
    underlyingAsset = Address.fromString(
      "0xb54f16fb19478766a268f172c9480f8da1a7c9c3"
    );
  }

  if (token.forgeId.startsWith("Butterfly")) {
    // underlying asset is BTRFLY
    underlyingAsset = Address.fromString(
      "0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a"
    );
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
    case 137:
    case 43114: {
      // Avalanche
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
