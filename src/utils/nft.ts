import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { UserA, UserB } from "../../generated/schema";
import { ZERO_BD } from "./consts";

let startWeekId = -1;
let boxAmountX = BigDecimal.fromString("160");
let boxAmountY = BigDecimal.fromString("800");

function loadUserA(user: Address): UserA {
  let user_a = UserA.load(user.toHexString());
  if (user_a != null) return user_a as UserA;

  user_a = new UserA(user.toHexString());
  user_a.box = 0;
  user_a.lpMinThisWeek = ZERO_BD;
  user_a.lpHolding = ZERO_BD;
  user_a.updatedAt = 0;
  user_a.actionThisWeek = 0;
  user_a.save();
  return user_a as UserA;
}

function loadUserB(user: Address): UserB {
  let user_b = UserB.load(user.toHexString());
  if (user_b != null) return user_b as UserB;

  user_b = new UserB(user.toHexString());
  user_b.box = 0;
  user_b.lpHolding = ZERO_BD;
  user_b.lpMinToday = ZERO_BD;
  user_b.updatedAt = 0;
  user_b.save();
  return user_b as UserB;
}

export function updateNFTData(
  _user: Address,
  change: BigDecimal,
  timestamp: number
): void {
  let isBoxB = false;
  let week = 86400 * 7;
  if (!isBoxB) {
    // Mystery Box A
    let user = loadUserA(_user);
    let updatedWeek = user.updatedAt / week;
    let thisWeek = timestamp / week;

    if (thisWeek > updatedWeek) {
      if (user.lpHolding.ge(boxAmountX)) {
        user.box = (user.box +
          getNumWeek(updatedWeek + 1, thisWeek - 1)) as i32;
      }
      if (user.lpHolding.ge(boxAmountY)) {
        user.box = (user.box +
          getNumWeek(updatedWeek + 1, thisWeek - 1)) as i32;
      }
      if (user.lpMinThisWeek.ge(boxAmountX)) {
        user.box = (user.box + 1) as i32;
      }
      if (user.lpMinThisWeek.ge(boxAmountY)) {
        user.box = (user.box + 1) as i32;
      }
    }
    user.lpHolding = user.lpHolding.plus(change);
    if (user.lpHolding.lt(user.lpMinThisWeek)) {
      user.lpMinThisWeek = user.lpHolding;
    }
    user.updatedAt = timestamp as i32;
    user.save();
  } else {
    // Mystery Box B
    let user = loadUserB(_user);
    let updatedWeek = user.updatedAt / week;
    let thisWeek = timestamp / week;

    if (thisWeek > updatedWeek) {
      if (user.lpHolding.ge(boxAmountY)) {
        user.box = (user.box +
          getNumWeek(updatedWeek + 1, thisWeek - 1)) as i32;
      }
      if (user.lpMinToday.ge(boxAmountY)) {
        user.box = (user.box + 1) as i32;
      }
    }
    user.lpHolding = user.lpHolding.plus(change);
    if (user.lpHolding.lt(user.lpMinToday)) {
      user.lpMinToday = user.lpHolding;
    }
    user.updatedAt = timestamp as i32;
    user.save();
  }
}

function getNumWeek(l: number, r: number): number {
  if (startWeekId > l) l = startWeekId;
  if (l > r) return 0;
  return r - l + 1;
}
