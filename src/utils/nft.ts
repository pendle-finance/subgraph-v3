import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { UserA, UserB } from "../../generated/schema";
import { ADDRESS_ZERO, isBoxAAddress, ZERO_BD } from "./consts";
import { printDebug } from "./helpers";

let startWeekId = 2695;
let startDayId = 18865;

let actionPerWeek = 5;
let swapAmount = BigDecimal.fromString("180");
let mintAmount = BigDecimal.fromString("360");
let boxAmountX = BigDecimal.fromString("400");
let boxAmountY = BigDecimal.fromString("1600");

let INF_BD = BigDecimal.fromString("100000000000000");

function loadUserA(user: Address): UserA {
  let user_a = UserA.load(user.toHexString());
  if (user_a != null) return user_a as UserA;

  user_a = new UserA(user.toHexString());
  user_a.box = 0;
  user_a.lpHolding = ZERO_BD;
  user_a.lpMinThisWeek = ZERO_BD;
  user_a.updatedAt = 0;
  user_a.actionThisWeek = 0;
  user_a.actionUpdatedAt = 0;
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
  market: Address,
  change: BigDecimal,
  timestamp: number
): void {
  if (_user.toHexString() == ADDRESS_ZERO || change.equals(ZERO_BD)) {
    return;
  }
  let isBoxA = isBoxAAddress(market);
  let day = 86400;
  let week = day * 7;

  if (isBoxA) {
    // Mystery Box A
    let user = loadUserA(_user);
    if (user.id == "0x17d96151c806eea5a1bad43365c4405be341fc6c") {
      printDebug(timestamp.toString() + " " + BigInt.fromI32(user.box).toString() + " " + user.lpHolding.toString(), "userA");
    }
    let updatedWeek = Math.floor(user.updatedAt / week);
    let thisWeek = Math.floor(timestamp / week);

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
        user.box = (user.box + getNumWeek(updatedWeek, updatedWeek)) as i32;
      }
      if (user.lpMinThisWeek.ge(boxAmountY)) {
        user.box = (user.box + getNumWeek(updatedWeek, updatedWeek)) as i32;
      }
      user.lpMinThisWeek = user.lpHolding;
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
    let updatedDay = Math.floor(user.updatedAt / day);
    let today = Math.floor(timestamp / day);

    if (today > updatedDay) {
      if (user.lpHolding.ge(boxAmountY)) {
        user.box = (user.box + getNumDay(updatedDay + 1, today - 1)) as i32;
      }
      if (user.lpMinToday.ge(boxAmountY)) {
        user.box = (user.box + getNumDay(updatedDay, updatedDay)) as i32;
      }
      user.lpMinToday = user.lpHolding;
    }
    user.lpHolding = user.lpHolding.plus(change);
    if (user.lpHolding.lt(user.lpMinToday)) {
      user.lpMinToday = user.lpHolding;
    }
    user.updatedAt = timestamp as i32;
    user.save();
  }
}

export function increaseActionBox(_user: Address, timestamp: number): void {
  let user = loadUserA(_user);
  let _week = 86400 * 7;
  let thisWeek = Math.floor(timestamp / _week);
  let updatedWeek = Math.floor(user.actionUpdatedAt / _week);
  user.actionUpdatedAt = timestamp as i32;
  if (thisWeek > updatedWeek) {
    user.actionThisWeek = 0;
  }
  user.save();
  if (user.actionThisWeek == actionPerWeek) return;
  user.box = user.box + getNumWeek(thisWeek, thisWeek) as i32;
  user.actionThisWeek = user.actionThisWeek + getNumWeek(thisWeek, thisWeek) as i32;
  user.save();
}

export function swapActionNFT(
  _user: Address,
  market: Address,
  amount: BigDecimal,
  timestamp: number
): void {
  let isBoxA = isBoxAAddress(market);
  if (!isBoxA || amount.lt(swapAmount)) return;
  increaseActionBox(_user, timestamp);
}

export function mintActionNFT(
  _user: Address,
  underlyingAsset: Address,
  amount: BigDecimal,
  timestamp: number
): void {
  let isBoxA = isBoxAAddress(underlyingAsset);
  if (!isBoxA || amount.lt(mintAmount)) return;
  increaseActionBox(_user, timestamp);
}

function getNumWeek(l: number, r: number): number {
  if (startWeekId > l) l = startWeekId;
  if (l > r) return 0;
  return r - l + 1;
}

function getNumDay(l: number, r: number): number {
  if (startDayId > l) l = startDayId;
  if (l > r) return 0;
  return r - l + 1;
}
