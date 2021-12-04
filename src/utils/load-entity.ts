import { Address, log } from "@graphprotocol/graph-ts";
import {
  LiquidityMining,
  PendleData,
  Token,
  User,
  UserMarketData
} from "../../generated/schema";
import { PendleLiquidityMiningV1 } from "../../generated/templates";
import { ZERO_BD, ZERO_BI } from "./consts";
import {
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenTotalSupply
} from "./token-fetch";
import { printDebug } from "../utils/helpers";

export function loadUser(address: Address): User {
  let user = User.load(address.toHexString());
  if (user === null) {
    user = new User(address.toHexString());
    user.usdSwapped = ZERO_BD;
    user.hasZapped = false;
    user.save();
  }
  return user as User;
}

export function generateNewToken(tokenAddress: Address): Token | null {
  let token: Token = new Token(tokenAddress.toHexString());
  token.symbol = fetchTokenSymbol(tokenAddress);
  token.name = fetchTokenName(tokenAddress);
  token.totalSupply = fetchTokenTotalSupply(tokenAddress);
  let decimals = fetchTokenDecimals(tokenAddress);
  // bail if we couldn't figure out the decimals
  if (decimals === null) {
    log.debug("mybug the decimal on token 0 was null", []);
    return null;
  }
  token.forgeId = "Unassigned";

  token.decimals = decimals;
  token.tradeVolume = ZERO_BD;
  token.tradeVolumeUSD = ZERO_BD;

  token.mintVolume = ZERO_BD;
  token.mintVolumeUSD = ZERO_BD;

  token.redeemVolume = ZERO_BD;
  token.redeemVolumeUSD = ZERO_BD;
  // token.allPairs = []
  token.txCount = ZERO_BI;
  token.totalLiquidity = ZERO_BD;
  token.markets = [];

  token.save();

  return token;
}

export function loadToken(tokenAddress: Address): Token | null {
  let token = Token.load(tokenAddress.toHexString());
  if (!token) {
    return generateNewToken(tokenAddress);
  }
  return token;
}

export function loadPendleData(): PendleData {
  let pendleData = PendleData.load("1");
  if (pendleData === null) {
    pendleData = new PendleData("1");
    pendleData.protocolSwapFee = ZERO_BD;
    pendleData.swapFee = ZERO_BD;
    pendleData.exitFee = ZERO_BD;
  }

  pendleData.save();
  return pendleData as PendleData;
}

export function loadUserMarketData(
  user: Address,
  market: Address
): UserMarketData {
  let id = user.toHexString() + "-" + market.toHexString();
  let ins = UserMarketData.load(id);
  if (ins != null) {
    return ins as UserMarketData;
  }
  ins = new UserMarketData(id);
  ins.user = loadUser(user).id;
  ins.market = market.toHexString();
  ins.lpHolding = ZERO_BI;
  ins.recordedUSDValue = ZERO_BD;
  ins.capitalProvided = ZERO_BD;
  ins.capitalWithdrawn = ZERO_BD;
  ins.yieldClaimedRaw = ZERO_BD;
  ins.yieldClaimedUsd = ZERO_BD;
  ins.pendleRewardReceivedRaw = ZERO_BD;
  ins.pendleRewardReceivedUSD = ZERO_BD;
  ins.lpPrice = ZERO_BD;
  ins.save();
  return ins as UserMarketData;
}

export function loadLiquidityMiningV1(lmAddress: Address): LiquidityMining {
  let lm = LiquidityMining.load(lmAddress.toHexString());
  if (lm != null) {
    return lm as LiquidityMining;
  }
  lm = new LiquidityMining(lmAddress.toHexString());
  lm.save();
  PendleLiquidityMiningV1.create(lmAddress);
  return lm as LiquidityMining;
}
