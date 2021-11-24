import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  SushiswapPair,
  Token,
  SushiswapPairHourData,
  LiquidityMining,
  LpTransferEvent,
} from "../../generated/schema";
import { PairCreated as SushiswapPairCreatedEvent } from "../../generated/SushiswapFactory/SushiswapFactory";
import {
  Swap as SwapEvent,
  Transfer as TransferEvent,
} from "../../generated/SushiswapFactory/SushiswapPair";
import {
  ADDRESS_ZERO,
  DAYS_PER_WEEK_BD,
  DAYS_PER_YEAR_BD,
  ERROR_COMPOUND_SUSHISWAP_PAIR,
  ONE_BD,
  ONE_BI,
  ONE_HOUR,
  PENDLE_ETH_SUSHISWAP,
  PENDLE_TOKEN_ADDRESS,
  TWO_BD,
  WETH_ADDRESS,
  ZERO_BD,
  ZERO_BI,
} from "../utils/consts";
import {
  convertTokenToDecimal,
  getBalanceOf,
  exponentToBigDecimal,
} from "../utils/helpers";
import { SushiswapPair as SushiswapPairTemplate } from "../../generated/templates";
import { SushiswapPair as SushiswapPairContract } from "../../generated/templates/SushiswapPair/SushiswapPair";
import { LiquidityMiningV2 } from "../../generated/templates/SushiswapPair/LiquidityMiningV2";
import { loadToken, loadUserMarketData } from "../utils/load-entity";
import { getTokenPrice } from "../pricing";
import { getSushiLpPrice } from "./pricing";

export function isOwnershipToken(tokenAddress: Address): boolean {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null || token.type != "ot") {
    return false as boolean;
  }
  return true as boolean;
}

export function handleNewSushiswapPair(event: SushiswapPairCreatedEvent): void {
  // skip error compound pair
  if (event.params.pair.toHexString() == ERROR_COMPOUND_SUSHISWAP_PAIR) {
    return;
  }

  let id = "";
  let baseToken = "";
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
    let otMarket = new SushiswapPair(event.params.pair.toHexString());
    otMarket.otToken = id;
    otMarket.baseToken = baseToken;
    otMarket.isOtToken0 = isOwnershipToken(event.params.token0);
    otMarket.totalTradingUSD = ZERO_BD;
    otMarket.save();
    updateSushiswapPair(
      Address.fromHexString(otMarket.id) as Address,
      event.block.timestamp
    );
  }
}

export function updateSushiswapPair(
  pairAddress: Address,
  timestamp: BigInt
): SushiswapPair {
  let pair = SushiswapPair.load(pairAddress.toHexString());
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
    return pair as SushiswapPair;

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

  getOtApr(pair as SushiswapPair, timestamp);
  return pair as SushiswapPair;
}

export function getOtApr(pair: SushiswapPair, timestamp: BigInt): void {
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

  if (totalStaked.equals(ZERO_BI)) return;

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

export function handleSwapSushiswap(event: SwapEvent): void {
  let pair = updateSushiswapPair(event.address, event.block.timestamp);
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

  tradingValue = tradingValue.times(getTokenPrice(baseToken));

  let timestamp = event.block.timestamp.toI32();
  let hourID = timestamp / ONE_HOUR;
  let hourStartUnix = hourID * ONE_HOUR;
  let hourPairID = pair.id
    .concat("-")
    .concat(BigInt.fromI32(hourID).toString());

  let sushiswapPairHourData = SushiswapPairHourData.load(hourPairID);

  if (sushiswapPairHourData === null) {
    sushiswapPairHourData = new SushiswapPairHourData(hourPairID);
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

export function handleTransfer(event: TransferEvent): void {
  let pair = SushiswapPair.load(event.address.toHexString());
  if (pair == null) return;

  let from = event.params.from.toHexString();
  let to = event.params.to.toHexString();
  let fromBalanceChange = event.params.value.times(BigInt.fromI32(-1));
  let toBalanceChange = event.params.value;

  // if (fromBalanceChange.equals(ZERO_BI) && toBalanceChange.equals(ZERO_BI)) {
  //   return;
  // }

  let transferEvent = new LpTransferEvent(
    event.transaction.hash.toHexString() + "-" + from + "-" + to + "-" + pair.id
  );

  let token0 = pair.otToken;

  if (!pair.isOtToken0) {
    token0 = pair.baseToken;
  }

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

  updateUserMarketData(
    event.params.from,
    event.address,
    fromBalanceChange,
    lpPrice
  );
  updateUserMarketData(
    event.params.to,
    event.address,
    toBalanceChange,
    lpPrice
  );

  return;
}

function updateUserMarketData(
  user: Address,
  market: Address,
  change: BigInt,
  lpPrice: BigDecimal
): void {
  let ins = loadUserMarketData(user, market);

  ins.lpHolding = ins.lpHolding.plus(change);
  ins.recordedUSDValue = lpPrice.times(ins.lpHolding.toBigDecimal());
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

export function handleUpdateSushiswap(event: SwapEvent): void {
  let pair = updateSushiswapPair(event.address, event.block.timestamp);
  return;
}
