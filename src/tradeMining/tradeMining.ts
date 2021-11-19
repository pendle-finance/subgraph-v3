import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  TradeMiningUser,
  TradeMiningHouse,
  User,
  Pair,
} from "../../generated/schema";
import { ZERO_BD, chainId, ONE_BI } from "../utils/consts";
import { printDebug } from "../utils/helpers";

function getPhase(timestamp: BigInt): string {
  let startTimestamp = BigInt.fromI32(1637236800);
  let interval = BigInt.fromI32(1209600); // 2 week in seconds

  if (timestamp.lt(startTimestamp)) {
    return "0";
  }

  return timestamp
    .minus(startTimestamp)
    .div(interval)
    .plus(ONE_BI)
    .toString();
}

function mapMarketAddressToHouse(marketAddress: string): string[] {
  let houseArray = new Array<string>();
  switch (chainId) {
    case 43114:
      // YT-qiUSDC-2022 / USDC || YT-qiAvax/USDC market 
      if (
        marketAddress == "0x7552f903e33db53a86167c1e74f0e082bd0740d5" ||
        marketAddress == "0x80aae49b1142e2f135033829a1b647b1636c1506"
      )
        houseArray.push("BenQi");

      // YT-xJOE/USDC
      if (marketAddress == "0x3e2737eb1b513bcee93a2144204d22695b272215")
        houseArray.push("TraderJoe");

      // YT-PendleAvax/Pendle
      if (marketAddress == "0xd5736ba0be93c99a10e2264e8e4ebd54633306f8") {
        houseArray.push("Pendle");
      }

      break;
  }

  return houseArray;
}

export function getTradeMiningUser(
  userAddress: string,
  marketAddress: string,
  timestamp: BigInt
): TradeMiningUser[] {
  let phase = getPhase(timestamp);

  if (phase == "0") return [];

  let houses = mapMarketAddressToHouse(marketAddress);
  let tradeMiningUsers = new Array<TradeMiningUser>();

  for (let i = 0; i < houses.length; i++) {
    let key = userAddress + "-" + houses[i] + "-" + phase;
    let tradeMiningUser = TradeMiningUser.load(key);
    if (tradeMiningUser == null) {
      tradeMiningUser = new TradeMiningUser(key);
      tradeMiningUser.volumeUSD = ZERO_BD;
      tradeMiningUser.house = houses[i];
      tradeMiningUser.userAddress = userAddress;
      tradeMiningUser.phase = phase;
    }

    tradeMiningUsers.push(tradeMiningUser as TradeMiningUser);
  }

  return tradeMiningUsers as TradeMiningUser[];
}

export function getTradeMiningHouse(
  house: string,
  phase: string
): TradeMiningHouse {
  let key = house + "-" + phase;
  let tradeMiningHouse = TradeMiningHouse.load(key);

  if (tradeMiningHouse == null) {
    tradeMiningHouse = new TradeMiningHouse(key);
    tradeMiningHouse.volumeUSD = ZERO_BD;
    tradeMiningHouse.house = house;
    tradeMiningHouse.phase = phase;
  }

  return tradeMiningHouse as TradeMiningHouse;
}

export function sumTradeVolumeToHouse(
  tradeMiningUsers: TradeMiningUser[],
  volumeUSD: BigDecimal
): void {
  for (let i = 0; i < tradeMiningUsers.length; i++) {
    let tradeMiningUser = tradeMiningUsers[i];
    tradeMiningUser.volumeUSD = tradeMiningUser.volumeUSD.plus(volumeUSD);
    tradeMiningUser.save();

    let tradeMiningHouse = getTradeMiningHouse(
      tradeMiningUser.house,
      tradeMiningUser.phase
    );
    tradeMiningHouse.volumeUSD = tradeMiningHouse.volumeUSD.plus(volumeUSD);
    tradeMiningHouse.save();
  }
}

export function updateUserTrade(
  user: User,
  pair: Pair,
  amountUSD: BigDecimal,
  timestamp: BigInt,
  type: string
): void {
  // printDebug("amountUSD: " + amountUSD.toString() + " type: " + type, "tradeMining");
  let tradeMiningUsers = getTradeMiningUser(user.id, pair.id, timestamp);
  sumTradeVolumeToHouse(tradeMiningUsers, amountUSD);
}
