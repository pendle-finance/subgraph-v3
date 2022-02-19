import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export let STABLE_USD_TOKENS: Address[] = [
  Address.fromString("0xd586e7f844cea2f87f50152665bcbc2c279d8d70"), // DAI
  Address.fromString("0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664"), // USDC
  Address.fromString("0xc7198437980c041c805a1edcba50c1ce5db95118"), // USDT
  Address.fromString("0x130966628846bfd36ff31a822705796e8cb8c18d") // MIM
];

export let MONE_BD = BigDecimal.fromString("-1");
export let MONE_BI = BigInt.fromI32(-1);
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

export let WMEMO_ADDRESS = Address.fromString(
  "0x0da67235dd5787d67955420c84ca1cecd4e5bb3b"
);

export let TIME_ADDRESS = Address.fromString(
  "0xb54f16fb19478766a268f172c9480f8da1a7c9c3"
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
  "0xfb98b335551a418cd0737375a2ea0ded62ea213b"
);
export let PENDLE_ETH_SUSHISWAP = Address.fromString(
  "0x3acD2FF1c3450bc8a9765AfD8d0DeA8E40822c86"
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
  "0x91b7c55301c6cc44ce01bce66dc0dfd176cf16bb"
);

export let YTLiquidityMining: string[][] = [
  [
    "0x7552f903e33db53a86167c1e74f0e082bd0740d5",
    "0x3ffd8ecffb03626bd7dee699ce1921cc62185dea"
  ],
  [
    "0x80aae49b1142e2f135033829a1b647b1636c1506",
    "0x1305434fbe1c14a8c6c1d30bbf92f5baee506381"
  ],
  [
    "0xd5736ba0be93c99a10e2264e8e4ebd54633306f8",
    "0xab74bc51c94b0f4918df448e17d0bdf3528d5a8f"
  ],
  [
    "0x3e2737eb1b513bcee93a2144204d22695b272215",
    "0xb0badfa50aabf4eba331117c1a5c94b7c1dc6388"
  ]
];
