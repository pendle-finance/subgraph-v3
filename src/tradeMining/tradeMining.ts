import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { TradeMiningUser, TradeMiningHouse } from "../../generated/schema";
import { ZERO_BD, chainId, ONE_BI } from "../utils/consts";

function getPhase(block: ethereum.Block): String {
  let startTimestamp = BigInt.fromI32(1635846367);
  let interval = BigInt.fromI32(1209600); // 1 week in seconds

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
      if (marketAddress == "0x574d9626f0bfde8b48cb762154dabf052812ccc6")
        houseArray.push("BenQi");

      // YT-AvaxUSDC/USDC market || YT-xJOE/USDC 
      if (
        marketAddress == "0x414e36e93d055f1912d05fbd446e9c70899293fb" ||
        marketAddress == "0xCf5F662B388302836c1c2899446e2267b081c690"
      )
        houseArray.push("TraderJoe");

      // YT-PendleAvax/Pendle
      if (marketAddress == "0x027dfe08d7a3ce2562ce17a6f6f4b78d26f360bd") {
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
