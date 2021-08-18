import { Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { ICToken as ICTokenContract } from "../../generated/templates/IPendleForge/ICToken";
import { UniswapPool as UniswapPoolContract } from "../../generated/UniswapFactory/UniswapPool";
import { exponentToBigDecimal, getSushiLpPrice, loadToken, printDebug } from "../utils/helpers";
import { getUniswapPoolAddress } from "./factory";
import {
  COMPOUND_EXCHANGE_RATE_DECIMAL,
  WETH_ADDRESS,
  USDC_WETH_03_POOL,
  UNISWAP_Q192,
  ONE_BD,
  STABLE_USD_TOKENS,
  ZERO_BD,
  isMainnet,
  PENDLE_TOKEN_ADDRESS,
  TWO_BD
} from "../utils/consts";
import { getPendlePrice } from "../sushiswap/factory";

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
  let tryPrice = kovanHardcodedPrice(poolAddress);
  if (tryPrice.gt(ZERO_BD)) {
    return tryPrice;
  }

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
  if (!isMainnet) {
    return getKovanTokenPrice(loadToken(tokenAddress) as Token);
  }
  let poolAddress = getUniswapPoolAddress(tokenAddress, WETH_ADDRESS);
  if (poolAddress) {
    // tokenPrice = token/eth * eth price
    return getPoolPrice(poolAddress, tokenAddress).times(getEthPrice());
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

export function getUniswapTokenPrice(token: Token): BigDecimal {
  if (token.id == PENDLE_TOKEN_ADDRESS.toHexString()) return getPendlePrice();
  if (token.underlyingAsset != null && token.forgeId.startsWith("Sushi")) {
    return getSushiLpPrice(Address.fromHexString(token.id) as Address);
  }

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

export function kovanHardcodedPrice(pool: Address): BigDecimal {
  if (pool.toHexString() == "0x89007e48d47484245805679ab37114db117afab2") {
    return BigDecimal.fromString("0.0005");
  }
  if (pool.toHexString() == "0x877bd57caf5a8620f06e80688070f23f091df3b1") {
    return BigDecimal.fromString("0.0005");
  }
  if (pool.toHexString() == "0xbaca9d50c2ae0cd5b9a457e7dbe38c673197caa3") {
    return BigDecimal.fromString("2000");
  }
  return BigDecimal.fromString("0");
}

export function getKovanTokenPrice(token: Token): BigDecimal {
  if (token.id == "0xd0a1e359811322d97991e03f863a0c30c2cf029c") {
    // ethereum
    return BigDecimal.fromString("2000");
  }
  if (token.id == "0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa") {
    // USD DAI
    return ONE_BD;
  }
  if (token.id == "0xe22da380ee6b445bb8273c81944adeb6e8450422") {
    return ONE_BD;
  }
  if (token.id == "0x13512979ade267ab5100878e2e0f485b568328a4") {
    return ONE_BD;
  }
  if (token.id == "0xb7a4f3e9097c08da09517b5ab877f7a917224ede") {
    return ONE_BD;
  }
  if (token.id == PENDLE_TOKEN_ADDRESS.toHexString()) {
    /// PENDLE
    return ONE_BD;
  }
  return BigDecimal.fromString("0");
}
