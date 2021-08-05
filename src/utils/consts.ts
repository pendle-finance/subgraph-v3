import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export let STABLE_USD_TOKENS: Address[] = [
  Address.fromString("0x6b175474e89094c44da98b954eedeac495271d0f"), // DAI
  Address.fromString("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"), // USDC
  Address.fromString("0xdac17f958d2ee523a2206206994597c13d831ec7") // USDT
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
  "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
);
export let WETH_ADDRESS = Address.fromString(
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
);
export let USDC_ADDRESS = Address.fromString(
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
);
export let UNISWAP_Q192 = BigDecimal.fromString(
  BigInt.fromI32(2)
    .pow(192)
    .toString()
);

export let DAYS_PER_YEAR_BD = BigDecimal.fromString("365");
export let ONE_DAY = BigDecimal.fromString("86400");
export const ONE_HOUR = 3600;
export let PENDLE_TOKEN_ADDRESS = Address.fromString(
  "0x808507121b80c02388fad14726482e061b8da827"
);
export let PENDLE_ETH_SUSHISWAP = Address.fromString(
  "0x37922c69b08babcceae735a31235c81f1d1e8e43"
);
export const ERROR_COMPOUND_MARKET =
  "0x73a62de3b35126ae8f6a4547b9cbc170bc852001";
export const ERROR_COMPOUND_SUSHISWAP_PAIR =
  "0x1e790169999eb3bf4bcd41c650ab417faa53138d";

export const LIQUIDITY_MINING_PROXY = "0x70e649eb230dbaee72303ac14fa817b81dedcf0b";
export let LM_PROXY_START_BLOCK = BigInt.fromI32(12925093);
export let LM_ALLOC_DENOM = BigInt.fromI32(1000000000);
export let DAYS_PER_WEEK_BD = BigDecimal.fromString("7");
