import { Address } from "@graphprotocol/graph-ts";
import { PairCreated as QuickswapPairCreatedEvent } from "../../generated/QuickswapFactory/QuickswapFactory";
import { PricePool } from "../../generated/schema";
import { chainId } from "../utils/consts";

export function createQuickswapPair(
  poolAddress: Address,
  token0Address: Address,
  token1Address: Address
): void {
  let id = token0Address.toHexString() + "-" + token1Address.toHexString();
  let poolInstance = PricePool.load(id);
  if (poolInstance) {
    return;
  }
  poolInstance = new PricePool(id);
  poolInstance.poolAddress = poolAddress.toHexString();
  poolInstance.token0Address = token0Address.toHexString();
  poolInstance.token1Address = token1Address.toHexString();
  poolInstance.hasBeenUsed = false;
  poolInstance.save();
}

export function handleQuickswapPairCreated(
  event: QuickswapPairCreatedEvent
): void {
  createQuickswapPair(
    event.params.pair,
    event.params.token0,
    event.params.token1
  );
}

export function getQuickswapPairAddress(
  token0Address: Address,
  token1Address: Address
): Address {
  let id = token0Address.toHexString() + "-" + token1Address.toHexString();
  let poolInstance = PricePool.load(id);
  if (!poolInstance) {
    id = token1Address.toHexString() + "-" + token0Address.toHexString();
    poolInstance = PricePool.load(id);
  }
  if (!poolInstance) {
    return null;
  }
  let poolAddress = Address.fromHexString(poolInstance.poolAddress) as Address;
  poolInstance.hasBeenUsed = true;
  poolInstance.save();
  return poolAddress;
}

export function initializeQuickSwapPools(): void {
  switch (chainId) {
    case 137:
      // ETH - WETH
      createQuickswapPair(
        Address.fromString("0xadbf1854e5883eb8aa7baf50705338739e558e5b"),
        Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
        Address.fromString("0x7ceb23fd6bc0add59e62ac25578270cff1b9f619")
      );

      // ETH - DAI
      createQuickswapPair(
        Address.fromString("0xeef611894ceae652979c9d0dae1deb597790c6ee"),
        Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
        Address.fromString("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063")
      );

      // ETH - USDC
      createQuickswapPair(
        Address.fromString("0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827"),
        Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
        Address.fromString("0x2791bca1f2de4661ed88a30c99a7a9449aa84174")
      );

      // ETH - USDT
      createQuickswapPair(
        Address.fromString("0x604229c960e5cacf2aaeac8be68ac07ba9df81c3"),
        Address.fromString("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"),
        Address.fromString("0xc2132d05d31c914a87c6611c10748aeb04b58e8f")
      );
      break;

    case 43114:
      // ETH - WETH
      createQuickswapPair(
        Address.fromString("0xfe15c2695f1f920da45c30aae47d11de51007af9"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab")
      );

      // ETH - DAI
      createQuickswapPair(
        Address.fromString("0x87dee1cc9ffd464b79e058ba20387c1984aed86a"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0xd586e7f844cea2f87f50152665bcbc2c279d8d70")
      );

      // ETH - USDC
      createQuickswapPair(
        Address.fromString("0xa389f9430876455c36478deea9769b7ca4e3ddb1"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664")
      );

      // ETH - USDT
      createQuickswapPair(
        Address.fromString("0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0xc7198437980c041c805a1edcba50c1ce5db95118")
      );

       // ETH - JOE
       createQuickswapPair(
        Address.fromString("0x454e67025631c065d3cfad6d71e6892f74487a15"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd")
      );
      break;
  }
}
