import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  LiquidityMining,
  LpTransferEvent,
  Pair,
  Token
} from "../../generated/schema";
import { PendleLiquidityMiningV1 as PendleLm1Contract } from "../../generated/templates/PendleLiquidityMiningV1/PendleLiquidityMiningV1";
import {
  PendleMarket as PendleMarketContract,
  Sync as SyncEvent,
  Transfer as TransferEvent
} from "../../generated/templates/PendleMarket/PendleMarket";
import {
  ADDRESS_ZERO,
  DAYS_PER_WEEK_BD,
  DAYS_PER_YEAR_BD,
  LM_ALLOC_DENOM,
  ONE_BD,
  ONE_BI,
  PENDLE_TOKEN_ADDRESS,
  RONE,
  ZERO_BD,
  ZERO_BI
} from "../utils/consts";
import { LiquidityMiningV2 as LM2Contract } from "../../generated/Directory/LiquidityMiningV2";

import {
  calcMarketWorthUSD,
  convertTokenToDecimal,
  getLpPrice,
  isMarketLiquidityMiningV2,
  printDebug
} from "../utils/helpers";
import { loadToken, loadUser, loadUserMarketData } from "../utils/load-entity";
import { getTokenPrice } from "../pricing";

export function handleTransfer(event: TransferEvent): void {
  // To make sure that theres lp holder

  let market = Pair.load(event.address.toHexString()) as Pair;
  updateMarketLiquidityMiningApr(event.block.timestamp, market as Pair);
  let from = event.params.from.toHexString();
  let to = event.params.to.toHexString();
  let fromBalanceChange = ZERO_BI;
  let toBalanceChange = ZERO_BI;
  if (
    from == market.yieldTokenHolderAddress ||
    to == market.yieldTokenHolderAddress
  ) {
    // Stake & Withdraw
    // Leave user's lp balance
  } else {
    // Normal Transfer
    fromBalanceChange = event.params.value.times(BigInt.fromI32(-1));
    toBalanceChange = event.params.value;
  }
  if (fromBalanceChange.equals(ZERO_BI) && toBalanceChange.equals(ZERO_BI)) {
    return;
  }

  let transferEvent = new LpTransferEvent(
    event.transaction.hash.toHexString() +
      "-" +
      from +
      "-" +
      to +
      "-" +
      market.id
  );
  transferEvent.from = from;
  transferEvent.to = to;
  transferEvent.market = market.id;
  transferEvent.lpPrice = getLpPrice(market);
  transferEvent.amount = event.params.value;
  transferEvent.timestamp = event.block.timestamp;
  transferEvent.block = event.block.number;
  transferEvent.save();

  updateUserMarketData(
    event.params.from,
    event.address,
    fromBalanceChange,
    event.block.timestamp.toI32()
  );
  updateUserMarketData(
    event.params.to,
    event.address,
    toBalanceChange,
    event.block.timestamp.toI32()
  );
}

function updateUserMarketData(
  user: Address,
  market: Address,
  change: BigInt,
  timestamp: number
): void {
  let pair = Pair.load(market.toHexString()) as Pair;
  let ins = loadUserMarketData(user, market);
  let lpPrice = getLpPrice(pair);

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

export function handleSync(event: SyncEvent): void {
  let pair = Pair.load(event.address.toHex());
  let token0 = Token.load(pair.token0); // xyt
  let token1 = Token.load(pair.token1); // baseToken
  let marketContract = PendleMarketContract.bind(
    Address.fromHexString(pair.id) as Address
  );

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  pair.totalSupply = marketContract.totalSupply().toBigDecimal();
  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);
  /* Fetches spot price*/

  let xytBalance = event.params.reserve0.toBigDecimal();
  let xytWeight_BI = event.params.weight0;
  let tokenBalance = event.params.reserve1.toBigDecimal();
  let tokenWeight_BI = RONE.minus(xytWeight_BI);

  pair.token0WeightRaw = xytWeight_BI;
  pair.token1WeightRaw = tokenWeight_BI;

  let xytWeight_BD = xytWeight_BI.toBigDecimal();
  let tokenWeight_BD = tokenWeight_BI.toBigDecimal();

  let xytDecimal = token0.decimals;
  let baseDecimal = token1.decimals;

  if (pair.reserve0.notEqual(ZERO_BD) && pair.reserve1.notEqual(ZERO_BD)) {
    let rawXytPrice = tokenBalance
      .times(xytWeight_BD)
      .div(tokenWeight_BD.times(xytBalance));

    let multipledBy = BigInt.fromI32(10).pow(
      xytDecimal.minus(baseDecimal).toI32() as u8
    );

    pair.token0Price = rawXytPrice.times(multipledBy.toBigDecimal());
    pair.token1Price = ONE_BD;
  } else {
    pair.token0Price = ZERO_BD;
    pair.token1Price = ZERO_BD;
  }

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  // save entities
  pair.reserveUSD = calcMarketWorthUSD(pair as Pair);
  pair.save();
  pair.lpPriceUSD = getLpPrice(pair as Pair);
  pair.save();

  pair.lpStaked = ZERO_BD;
  pair.lpStakedUSD = ZERO_BD;
  pair.lpAPR = ZERO_BD;
  pair.save();

  updateMarketLiquidityMiningApr(event.block.timestamp, pair as Pair);
  // pair.save();

  token0.save();
  token1.save();
}

export function redeemLpInterests(
  user: Address,
  market: Address,
  amount: BigInt
): void {
  let pair = Pair.load(market.toHexString());
  let yt = Token.load(pair.token0);
  let yieldBearingAsset = loadToken(
    Address.fromHexString(yt.underlyingAsset) as Address
  );
  let amountBD = convertTokenToDecimal(amount, yieldBearingAsset.decimals);
  let relation = loadUserMarketData(user, market);
  relation.yieldClaimedRaw = relation.yieldClaimedRaw.plus(amountBD);
  relation.yieldClaimedUsd = relation.yieldClaimedUsd.plus(
    amountBD.times(getTokenPrice(yieldBearingAsset as Token))
  );
  relation.save();
}

export function updateMarketLiquidityMiningApr(
  timestamp: BigInt,
  pair: Pair
): void {
  let marketAddress = Address.fromHexString(pair.id) as Address;
  if (!isMarketLiquidityMiningV2(marketAddress)) {
    /// LMV2 not found from directory contract
    if (pair.liquidityMining == null) return; /// LMV1 not found as well

    /// LMV1
    let lm = Address.fromHexString(pair.liquidityMining) as Address;
    let lmContract = PendleLm1Contract.bind(lm);
    let pendleToken = loadToken(PENDLE_TOKEN_ADDRESS);

    // see if Liquidity Mining is deployed?
    let tryContract = lmContract.try_startTime();
    if (tryContract.reverted) {
      return;
    }

    if (pair.yieldTokenHolderAddress == null) {
      pair.yieldTokenHolderAddress = lmContract
        .readExpiryData(pair.expiry)
        .value3.toHexString();
    }

    let lpPrice = pair.lpPriceUSD;
    if (lpPrice.equals(ZERO_BD)) {
      return;
    }

    let currentEpoch = ZERO_BI;
    let t = timestamp;
    let startTime = lmContract.startTime();
    let epochDuration = lmContract.epochDuration();
    if (t.ge(startTime)) {
      currentEpoch = t
        .minus(startTime)
        .div(epochDuration)
        .plus(ONE_BI);
    }

    let epochData = lmContract.readEpochData(currentEpoch);
    let totalReward = epochData.value1;
    let settingId = epochData.value0;

    if (settingId.equals(ZERO_BI)) {
      settingId = lmContract.latestSetting().value0;
    }
    let alloc = lmContract.allocationSettings(settingId, pair.expiry);
    let actualReward = totalReward.times(alloc).div(LM_ALLOC_DENOM);
    let totalStakeLp = lmContract.readExpiryData(pair.expiry).value0;
    if (totalStakeLp.equals(ZERO_BI)) {
      return;
    }

    pair.lpStaked = totalStakeLp.toBigDecimal();
    pair.lpStakedUSD = pair.lpPriceUSD.times(pair.lpStaked);

    let pendlePerLpBD = convertTokenToDecimal(
      actualReward,
      pendleToken.decimals
    ).div(pair.lpStakedUSD);

    let apw = pendlePerLpBD.times(getTokenPrice(pendleToken as Token));
    pair.lpAPR = apw.times(DAYS_PER_YEAR_BD).div(DAYS_PER_WEEK_BD);
    pair.save();
    return;
  } else {
    if (pair.liquidityMining == null) {
      let lmInstance = LiquidityMining.load(marketAddress.toHexString());
      pair.liquidityMining = lmInstance.lmAddress;
      pair.yieldTokenHolderAddress = pair.liquidityMining;
      pair.save();
    }

    let lmAddress = Address.fromHexString(pair.liquidityMining) as Address;
    let lmContract = LM2Contract.bind(lmAddress);

    let startTime = lmContract.startTime();
    let epochDuration = lmContract.epochDuration();
    let currentEpoch = ZERO_BI;

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

    pair.lpStaked = totalStaked.toBigDecimal();
    pair.lpStakedUSD = pair.lpStaked.times(pair.lpPriceUSD);

    let pendleToken = loadToken(PENDLE_TOKEN_ADDRESS);
    let pendlePerLp = convertTokenToDecimal(
      totalReward,
      pendleToken.decimals
    ).div(totalStaked.toBigDecimal());

    let apw = pendlePerLp
      .times(getTokenPrice(pendleToken as Token))
      .div(pair.lpPriceUSD);
    pair.lpAPR = apw
      .times(DAYS_PER_YEAR_BD)
      .div(DAYS_PER_WEEK_BD)
      .times(BigDecimal.fromString("100"));
    pair.save();
  }

  return;
}
