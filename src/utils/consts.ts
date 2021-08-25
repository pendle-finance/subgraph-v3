import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export let STABLE_USD_TOKENS: Address[] = [
  // Address.fromString("0x6b175474e89094c44da98b954eedeac495271d0f"), // DAI
  // Address.fromString("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"), // USDC
  // Address.fromString("0xdac17f958d2ee523a2206206994597c13d831ec7") // USDT
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
export let USDC_WETH_03_POOL = Address.fromString(
  "0xbaca9d50c2ae0cd5b9a457e7dbe38c673197caa3"
);
export let WETH_ADDRESS = Address.fromString(
  "0xd0a1e359811322d97991e03f863a0c30c2cf029c"
);
export let USDC_ADDRESS = Address.fromString(
  "0xe22da380ee6b445bb8273c81944adeb6e8450422"
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
  "0xff3b42ccb73dc70af4bb2a03efcf021b5ad08033"
);
export let PENDLE_ETH_SUSHISWAP = Address.fromString(
  "0x0db5af4b374e810f6e5a15ccc3d65e28cc4dbec7"
);
export const ERROR_COMPOUND_MARKET =
  "0x73a62de3b35126ae8f6a4547b9cbc170bc852001";
export const ERROR_COMPOUND_SUSHISWAP_PAIR =
  "0x1e790169999eb3bf4bcd41c650ab417faa53138d";

export let LM_ALLOC_DENOM = BigInt.fromI32(1000000000);
export const isMainnet = false;
