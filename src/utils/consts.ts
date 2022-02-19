import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export let STABLE_USD_TOKENS: Address[] = [
  Address.fromString("0x6b175474e89094c44da98b954eedeac495271d0f"), // DAI
  Address.fromString("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"), // USDC
  Address.fromString("0xdac17f958d2ee523a2206206994597c13d831ec7"), // USDT
];

export let TWO_BD = BigDecimal.fromString("2");
export let MONE_BI = BigInt.fromI32(-1);
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
  "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
);
export let WETH_ADDRESS = Address.fromString(
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
);
export let USDC_ADDRESS = Address.fromString(
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
);
export let WMATIC_ADDRESS = Address.fromString(
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
);

export let WMEMO_ADDRESS = Address.fromString(
  "0x0da67235dd5787d67955420c84ca1cecd4e5bb3b"
);

export let TIME_ADDRESS = Address.fromString(
  "0xb54f16fb19478766a268f172c9480f8da1a7c9c3"
);

export let BTRFLY_ADDRESS = Address.fromString(
  "0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a"
);

export let WXBTRFLY_ADDRESS = Address.fromString(
  "0x4b16d95ddf1ae4fe8227ed7b7e80cf13275e61c9"
);

export let UNISWAP_Q192 = BigDecimal.fromString(
  BigInt.fromI32(2)
    .pow(192)
    .toString()
);

export let PENDLE_WRAPPER: Address = Address.fromString(
  "0x91b7c55301c6cc44ce01bce66dc0dfd176cf16bb"
);

export let DAYS_PER_YEAR_BD = BigDecimal.fromString("365");
export let DAYS_PER_WEEK_BD = BigDecimal.fromString("7");

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

export let LM_ALLOC_DENOM = BigInt.fromI32(1000000000);

export const chainId: u32 = 1;

export function getHardcodedPrice(tokenAddress: Address): BigDecimal {
  return BigDecimal.fromString("0");
}
