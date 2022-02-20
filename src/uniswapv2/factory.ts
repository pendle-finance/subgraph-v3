import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { PairCreated as QuickswapPairCreatedEvent } from "../../generated/QuickswapFactory/QuickswapFactory";
import {
  OTPair,
  PricePool,
  Token,
  LiquidityMining,
  OTPairHourData,
  LpTransferEvent
} from "../../generated/schema";
import { chainId, MONE_BI } from "../utils/consts";
import { SushiswapPair as SushiswapPairTemplate } from "../../generated/templates";
import {
  convertTokenToDecimal,
  exponentToBigDecimal,
  getBalanceOf
} from "../utils/helpers";
import { getTokenPrice } from "../pricing";
import {
  ADDRESS_ZERO,
  DAYS_PER_WEEK_BD,
  DAYS_PER_YEAR_BD,
  ONE_BD,
  ONE_BI,
  ONE_HOUR,
  PENDLE_TOKEN_ADDRESS,
  TWO_BD,
  ZERO_BD,
  ZERO_BI
} from "../utils/consts";
import { loadToken, loadUserMarketData } from "../utils/load-entity";
import { LiquidityMiningV2 } from "../../generated/templates/SushiswapPair/LiquidityMiningV2";
import {
  SushiswapPair as SushiswapPairContract,
  Transfer as TransferEvent,
  Swap as SwapEvent
} from "../../generated/templates/SushiswapPair/SushiswapPair";

import { getSushiLpPrice } from "../sushiswap/pricing";

export function createUniswapV2Pair(
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

export function isOwnershipToken(tokenAddress: Address): boolean {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null || token.type != "ot") {
    return false as boolean;
  }
  return true as boolean;
}

export function handleNewUniswapV2Pair(event: QuickswapPairCreatedEvent): void {
  createUniswapV2Pair(
    event.params.pair,
    event.params.token0,
    event.params.token1
  );

  let id = "";
  let baseToken = "";
  baseToken = "";
  if (isOwnershipToken(event.params.token0)) {
    id = event.params.token0.toHexString();
    baseToken = event.params.token1.toHexString();
  }
  if (isOwnershipToken(event.params.token1)) {
    id = event.params.token1.toHexString();
    baseToken = event.params.token0.toHexString();
  }
  if (id != "") {
    // OT Market found
    SushiswapPairTemplate.create(event.params.pair);
    let otMarket = new OTPair(event.params.pair.toHexString());
    otMarket.otToken = id;
    otMarket.baseToken = baseToken;
    otMarket.isOtToken0 = isOwnershipToken(event.params.token0);
    otMarket.totalTradingUSD = ZERO_BD;
    otMarket.save();
    updateOTPair(
      Address.fromHexString(otMarket.id) as Address,
      event.block.timestamp
    );
  }
}

export function updateOTPair(pairAddress: Address, timestamp: BigInt): OTPair {
  let pair = OTPair.load(pairAddress.toHexString());
  let otAddress = Address.fromHexString(pair.otToken);
  let baseTokenAddress = Address.fromHexString(pair.baseToken);
  let otBalance = getBalanceOf(otAddress as Address, pairAddress as Address);
  let baseTokenBalance = getBalanceOf(
    baseTokenAddress as Address,
    pairAddress as Address
  );
  let baseTokenPrice = getTokenPrice(
    loadToken(baseTokenAddress as Address) as Token
  );
  let marketWorth = baseTokenPrice.times(baseTokenBalance).times(TWO_BD);

  if (otBalance.equals(ZERO_BD) || marketWorth.equals(ZERO_BD))
    return pair as OTPair;

  let otPrice = marketWorth.div(TWO_BD).div(otBalance);
  pair.baseTokenPrice = baseTokenPrice;
  pair.updatedAt = timestamp;
  pair.marketWorthUSD = marketWorth;
  pair.baseTokenBalance = baseTokenBalance;
  pair.otBalance = otBalance;
  pair.otPrice = otPrice;
  pair.lpPrice = ONE_BD;
  pair.totalStaked = ZERO_BI;
  pair.aprPercentage = ZERO_BD;
  pair.save();

  getOtApr(pair as OTPair, timestamp);
  return pair as OTPair;
}

export function getOtApr(pair: OTPair, timestamp: BigInt): void {
  let lmInstance = LiquidityMining.load(pair.id);
  if (lmInstance == null) return;
  let lmContract = LiquidityMiningV2.bind(
    Address.fromHexString(lmInstance.lmAddress) as Address
  );
  let pairContract = SushiswapPairContract.bind(
    Address.fromHexString(pair.id) as Address
  );
  let totalSupply = pairContract.totalSupply();

  let startTime = lmContract.startTime();
  let epochDuration = lmContract.epochDuration();
  let currentEpoch = ZERO_BI;
  let lpPrice = pair.marketWorthUSD.div(totalSupply.toBigDecimal());

  if (timestamp.ge(startTime)) {
    currentEpoch = timestamp
      .minus(startTime)
      .div(epochDuration)
      .plus(ONE_BI);
  }

  let epochData = lmContract.readEpochData(
    currentEpoch,
    Address.fromHexString(ADDRESS_ZERO) as Address
  );
  let totalStaked = lmContract.totalStake();
  let totalReward = epochData.value1;

  if (totalStaked.equals(ZERO_BI)) {
    pair.aprPercentage = BigDecimal.fromString("1000000");
    pair.save();
    return;
  }

  pair.lpPrice = lpPrice;
  pair.totalStaked = totalStaked;
  pair.totalReward = totalReward;

  let pendleToken = loadToken(PENDLE_TOKEN_ADDRESS);
  let pendlePerLp = convertTokenToDecimal(
    totalReward,
    pendleToken.decimals
  ).div(totalStaked.toBigDecimal());
  let apw = pendlePerLp.times(getTokenPrice(pendleToken as Token)).div(lpPrice);
  pair.aprPercentage = apw
    .times(DAYS_PER_YEAR_BD)
    .div(DAYS_PER_WEEK_BD)
    .times(BigDecimal.fromString("100"));
  pair.save();
  return;
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
    case 43114:
      // ETH - WETH
      createUniswapV2Pair(
        Address.fromString("0xfe15c2695f1f920da45c30aae47d11de51007af9"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab")
      );

      // ETH - DAI
      createUniswapV2Pair(
        Address.fromString("0x87dee1cc9ffd464b79e058ba20387c1984aed86a"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0xd586e7f844cea2f87f50152665bcbc2c279d8d70")
      );

      // ETH - USDC
      createUniswapV2Pair(
        Address.fromString("0xa389f9430876455c36478deea9769b7ca4e3ddb1"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664")
      );

      // ETH - USDT
      createUniswapV2Pair(
        Address.fromString("0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256"),
        Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"),
        Address.fromString("0xc7198437980c041c805a1edcba50c1ce5db95118")
      );
      break;
  }
}

export function handleSwapSushiswap(event: SwapEvent): void {
  let pair = updateOTPair(event.address, event.block.timestamp);
  let baseToken = loadToken(
    Address.fromHexString(pair.baseToken) as Address
  ) as Token;

  let tradingValue = ZERO_BD;
  if (pair.isOtToken0) {
    tradingValue = convertTokenToDecimal(
      event.params.amount1In.plus(event.params.amount1Out),
      baseToken.decimals
    );
  } else {
    tradingValue = convertTokenToDecimal(
      event.params.amount0In.plus(event.params.amount0Out),
      baseToken.decimals
    );
  }

  tradingValue = tradingValue.times(getTokenPrice(baseToken))

  let timestamp = event.block.timestamp.toI32();
  let hourID = timestamp / ONE_HOUR;
  let hourStartUnix = hourID * ONE_HOUR;
  let hourPairID = pair.id
    .concat("-")
    .concat(BigInt.fromI32(hourID).toString());

  let sushiswapPairHourData = OTPairHourData.load(hourPairID);

  if (sushiswapPairHourData === null) {
    sushiswapPairHourData = new OTPairHourData(hourPairID);
    sushiswapPairHourData.otAddress = pair.id;
    sushiswapPairHourData.tradingVolumeUSD = ZERO_BD;
    sushiswapPairHourData.hourStartUnix = hourStartUnix;
  }

  pair.totalTradingUSD = pair.totalTradingUSD.plus(tradingValue);
  sushiswapPairHourData.tradingVolumeUSD = sushiswapPairHourData.tradingVolumeUSD.plus(
    tradingValue
  );
  pair.save();
  sushiswapPairHourData.save();
  return;
}

export function handleUpdateSushiswap(event: SwapEvent): void {
  let pair = updateOTPair(event.address, event.block.timestamp);
  return;
}

export function handleTransfer(event: TransferEvent): void {
  let pair = OTPair.load(event.address.toHexString());
  if (pair == null) return;

  let from = event.params.from.toHexString();
  let to = event.params.to.toHexString();
  let fromBalanceChange = event.params.value.times(MONE_BI);
  let toBalanceChange = event.params.value;
  let transferEvent = new LpTransferEvent(
    event.transaction.hash.toHexString() + "-" + from + "-" + to + "-" + pair.id
  );

  let lpPrice = getSushiLpPrice(event.address).div(
    exponentToBigDecimal(loadToken(event.address).decimals)
  );

  transferEvent.from = from;
  transferEvent.to = to;
  transferEvent.market = pair.id;
  transferEvent.lpPrice = lpPrice;
  transferEvent.amount = event.params.value;
  transferEvent.timestamp = event.block.timestamp;
  transferEvent.block = event.block.number;
  transferEvent.save();

  updateUserMarketDataOt(event.params.from, event.address, fromBalanceChange);
  updateUserMarketDataOt(event.params.to, event.address, toBalanceChange);
  return;
}

export function updateUserMarketDataOt(
  user: Address,
  market: Address,
  change: BigInt
): void {
  let ins = loadUserMarketData(user, market);
  let lpPrice = getSushiLpPrice(market).div(
    exponentToBigDecimal(loadToken(market).decimals)
  );

  ins.lpHolding = ins.lpHolding.plus(change);
  ins.recordedUSDValue = lpPrice.times(ins.lpHolding.toBigDecimal());
  ins.lpPrice = lpPrice;
  if (change.lt(ZERO_BI)) {
    ins.capitalWithdrawn = ins.capitalWithdrawn.plus(
      change.toBigDecimal().times(lpPrice)
    );
  } else {
    ins.capitalProvided = ins.capitalProvided.plus(
      change.toBigDecimal().times(lpPrice)
    );
  }

  ins.save();
}
