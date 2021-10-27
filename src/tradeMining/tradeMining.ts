import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { TradeMiningUser } from "../../generated/schema";
import { ZERO_BD, chainId, ONE_BI } from "../utils/consts";

function getPhase(block: ethereum.Block): String {
  let startTimestamp = BigInt.fromI32(1634738108);
  let interval = BigInt.fromI32(604800); // 1 week in seconds

  if (block.timestamp.lt(startTimestamp)) {
    return "0";
  }

  return block.timestamp
    .minus(startTimestamp)
    .div(interval)
    .plus(ONE_BI)
    .toString();
}

function mapMarketAddressToHouse(marketAddress: string): String[] {
  let houseArray = new Array<string>();
  switch (chainId) {
    case 43114:
      // YT-qiUSDC-2022 / USDC
      if (marketAddress == "0x50d3a2991db715e51c55a5ec06488e91522029d2")
        houseArray.push("BenQi");

      // YT-AvaxUSDC/Avax market ||
      if (marketAddress == "0x66e98b6c1653c7f9fb0cd5ee520c0560d2d915d6")
        houseArray.push("TraderJoe");

      // YT-PendleAvax/Pendle
      if (marketAddress == "0xd0bd9be51f71ca8d863a312a5fa243391e17318c") {
        houseArray.push("TraderJoe");
        houseArray.push("Pendle");
      }

      break;
  }

  return houseArray;
}

export function getTradeMiningUser(
  userAddress: string,
  marketAddress: string,
  block: ethereum.Block
): TradeMiningUser[] {
  let phase = getPhase(block);

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

export function sumTradeVolumeToHouse(
  tradeMiningUsers: TradeMiningUser[],
  volumeUSD: BigDecimal
): void {
  for (let i = 0; i < tradeMiningUsers.length; i++) {
    let tradeMiningUser = tradeMiningUsers[i];
    tradeMiningUser.volumeUSD = tradeMiningUser.volumeUSD.plus(volumeUSD);
    tradeMiningUser.save();
  }
}
