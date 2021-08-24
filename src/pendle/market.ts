import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  LiquidityMining,
  LpHolder,
  LpTransferEvent,
  Pair,
  Token,
  UserMarketData
} from "../../generated/schema";
import { PendleLiquidityMiningV1 as PendleLm1Contract } from "../../generated/templates/PendleLiquidityMiningV1/PendleLiquidityMiningV1";
import {
  PendleMarket as PendleMarketContract,
  Sync as SyncEvent,
  Transfer as TransferEvent,
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
import { LiquidityMiningV2 as LM2Contract } from "../../generated/Directory/LiquidityMiningV2";

import {
  isMarketLiquidityMiningV2,
  printDebug
} from "../utils/helpers";

export function loadUserMarketData(user: Address, market: Address): UserMarketData {
  let id = user.toHexString().concat("-").concat(market.toHexString());
  let userInfo = UserMarketData.load(id);
  if (userInfo != null) return userInfo as UserMarketData;

  userInfo = new UserMarketData(id);
  userInfo.user = user.toHexString();
  userInfo.market = market.toHexString();
  userInfo.lpHolding = ZERO_BI;
  userInfo.recordedUSDValue = ZERO_BD;
  userInfo.yieldClaimedRaw = ZERO_BD;
  userInfo.yieldClaimedUsd = ZERO_BD;
  userInfo.save();
  return userInfo as UserMarketData;
}

export function updateLpHolder(
  marketAddress: Address,
): void {
  let pair = Pair.load(marketAddress.toHexString()) as Pair;
  if (!isMarketLiquidityMiningV2(marketAddress)) {
    /// LMV2 not found from directory contract
    if (pair.liquidityMining == null) return; /// LMV1 not found as well

    /// LMV1
    let lm = Address.fromHexString(pair.liquidityMining) as Address;
    let lmContract = PendleLm1Contract.bind(lm);

    // see if Liquidity Mining is deployed?
    let tryContract = lmContract.try_startTime();
    if (tryContract.reverted) {
      return;
    }

    if (pair.yieldTokenHolderAddress == null) {
      pair.yieldTokenHolderAddress = lmContract
        .readExpiryData(pair.expiry)
        .value3.toHexString();
      
      let lpHolder = new LpHolder(pair.yieldTokenHolderAddress);
      lpHolder.market = pair.id;
      lpHolder.save();
    } 
  }
  return;
}

export function handleTransfer(event: TransferEvent): void {
  let pair = Pair.load(event.address.toHexString());
  if (pair.yieldTokenHolderAddress != null) return;
  updateLpHolder(event.address);
}