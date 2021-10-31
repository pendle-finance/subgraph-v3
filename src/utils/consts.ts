import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export let STABLE_USD_TOKENS: Address[] = [
  Address.fromString("0xd586e7f844cea2f87f50152665bcbc2c279d8d70"), // DAI
  Address.fromString("0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664"), // USDC
  Address.fromString("0xc7198437980c041c805a1edcba50c1ce5db95118") // USDT
];

export let TWO_BD = BigDecimal.fromString("2");
export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let ZERO_BD = BigDecimal.fromString("0");
export let BI_18 = BigInt.fromI32(18);
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export let RONE = BigInt.fromI32(2).pow(40); // 2^40
export let RONE_BD = RONE.toBigDecimal();
export let ONE_BD = BigDecimal.fromString("1");
export let COMPOUND_EXCHANGE_RATE_DECIMAL = BigInt.fromI32(10)
  .pow(18)
  .toBigDecimal();
export let USDC_WETH_POOL = Address.fromString(
  "0xa389f9430876455c36478deea9769b7ca4e3ddb1"
);
export let WETH_ADDRESS = Address.fromString(
  "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"
);

export let WMATIC_ADDRESS = Address.fromString(
  "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"
);

export let UNISWAP_Q192 = BigDecimal.fromString(
  BigInt.fromI32(2)
    .pow(192)
    .toString()
);

export let DAYS_PER_YEAR_BD = BigDecimal.fromString("365");
export let DAYS_PER_WEEK_BD = BigDecimal.fromString("7");

export let ONE_DAY = BigDecimal.fromString("86400");
export const ONE_HOUR = 3600;
export let PENDLE_TOKEN_ADDRESS = Address.fromString(
  "0x36366298a3b6836e7030a7ff1964a1f0f44638e6"
);
export let PENDLE_ETH_SUSHISWAP = Address.fromString(
  "0xd82b9b055f79d1a244005406988f85ed970797ed"
);
export const ERROR_COMPOUND_MARKET =
  "0x73a62de3b35126ae8f6a4547b9cbc170bc852001";
export const ERROR_COMPOUND_SUSHISWAP_PAIR =
  "0x1e790169999eb3bf4bcd41c650ab417faa53138d";

export let LM_ALLOC_DENOM = BigInt.fromI32(1000000000);

export const chainId: u32 = 43114;

export function getHardcodedPrice(tokenAddress: Address): BigDecimal {
  return BigDecimal.fromString("0");
}

export let PENDLE_WRAPPER: Address = Address.fromString(
  "0xaA17b3AF8588f33eF5b9B2d3D64ce36139e8603D"
);
