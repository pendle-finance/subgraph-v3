import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export let STABLE_USD_TOKENS: Address[] = [
  Address.fromString("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"), // DAI
  Address.fromString("0x2791bca1f2de4661ed88a30c99a7a9449aa84174"), // USDC
  Address.fromString("0xc2132d05d31c914a87c6611c10748aeb04b58e8f") // USDT
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
  "0x853ee4b2a13f8a742d64c8f088be7ba2131f670d"
);
export let WETH_ADDRESS = Address.fromString(
  "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
);

export let WMATIC_ADDRESS = Address.fromString(
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
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

export const chainId: u32 = 137;

export function getHardcodedPrice(tokenAddress: Address): BigDecimal {
  return BigDecimal.fromString("0");
}
