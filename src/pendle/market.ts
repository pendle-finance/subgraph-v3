import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  LpTransferEvent,
  Pair,
  Token,
  UserMarketData
} from "../../generated/schema";
import { PendleLiquidityMiningV1 as PendleLm1Contract } from "../../generated/templates/PendleLiquidityMiningV1/PendleLiquidityMiningV1";
import {
  PendleMarket as PendleMarketContract,
  Sync as SyncEvent,
  Transfer as TransferEvent
} from "../../generated/templates/PendleMarket/PendleMarket";
import { getPendlePrice } from "../sushiswap/factory";
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

import {
  calcMarketWorthUSD,
  convertTokenToDecimal,
  getLpPrice,
  isMarketLiquidityMiningV2,
  loadToken,
  printDebug
} from "../utils/helpers";

export function handleTransfer(event: TransferEvent): void {
  // To make sure that theres lp holder
  updateMarketLiquidityMiningApr(event.address, event.block.timestamp);

  let market = Pair.load(event.address.toHexString()) as Pair;
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
    event.transaction.hash.toHexString() + "-" + from + "-" + to
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

function loadUserMarketData(user: Address, market: Address): UserMarketData {
  let id = user.toHexString() + "-" + market.toHexString();
  let ins = UserMarketData.load(id);
  if (ins != null) {
    return ins as UserMarketData;
  }
  ins = new UserMarketData(id);
  ins.user = user.toHexString();
  ins.market = market.toHexString();
  ins.lpHolding = ZERO_BI;
  ins.recordedUSDValue = ZERO_BD;
  ins.save();
  return ins as UserMarketData;
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
  let usdChange = lpPrice
    .times(ins.lpHolding.toBigDecimal())
    .minus(ins.recordedUSDValue);
  ins.recordedUSDValue = lpPrice.times(ins.lpHolding.toBigDecimal());
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
  updateMarketLiquidityMiningApr(event.address, event.block.timestamp);
  // pair.save();

  token0.save();
  token1.save();
}

function updateMarketLiquidityMiningApr(
  marketAddress: Address,
  timestamp: BigInt
): void {
  let pair = Pair.load(marketAddress.toHexString()) as Pair;
  let lm = Address.fromHexString(pair.liquidityMining) as Address;
  if (!isMarketLiquidityMiningV2(marketAddress)) {
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

    let pendlePerLp = actualReward.div(totalStakeLp);
    let pendlePerLpBD = convertTokenToDecimal(
      pendlePerLp,
      pendleToken.decimals
    );

    let apw = pendlePerLpBD.times(getPendlePrice()).div(lpPrice);
    pair.lpAPR = apw.times(DAYS_PER_YEAR_BD).div(DAYS_PER_WEEK_BD);
    pair.save();
    return;
  }

  if (pair.yieldTokenHolderAddress == null) {
    pair.yieldTokenHolderAddress = pair.liquidityMining;
    pair.save();
  }
  return;
}
