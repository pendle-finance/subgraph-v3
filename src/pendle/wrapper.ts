import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  AddLiquidityYT,
  SwapEventYT
} from "../../generated/PendleWrapper/PendleWrapper";
import { Pair, ZapVolume } from "../../generated/schema";
import { ZERO_BD } from "../utils/consts";
import { getTokenPair } from "../utils/helpers";
import { loadUser } from "../utils/load-entity";
import { handleJoinInfo, handleSwapInfo } from "./market/marketEventRouter";

const EVENT_TIMESTAMP = 1638144000;
const ONE_WEEK = 604800;
const OFFSET = 345600;

function getZapVolume(timestamp: BigInt): ZapVolume {
  timestamp = timestamp
    .minus(BigInt.fromI32(OFFSET))
    .div(BigInt.fromI32(ONE_WEEK));

  let zapVolume = ZapVolume.load(timestamp.toString());
  if (zapVolume === null) {
    zapVolume = new ZapVolume(timestamp.toString());
    zapVolume.volumeUSD = ZERO_BD;
    zapVolume.save();
  }
  return zapVolume as ZapVolume;
}

export function handleSwapEventYT(event: SwapEventYT): void {
  let pair: Pair = getTokenPair(
    event.params.inToken,
    event.params.outToken
  ) as Pair;
  let volumeUSD = handleSwapInfo(
    Address.fromHexString(pair.id) as Address,
    event.params.inToken,
    event.params.outToken,
    event.params.inAmount,
    event.params.outAmount,
    event.params.user,
    event
  );
  let zapVolume = getZapVolume(event.block.timestamp);
  zapVolume.volumeUSD = zapVolume.volumeUSD.plus(volumeUSD);
  zapVolume.save();

  let user = loadUser(event.params.user);
  if (user.hasZapped === false) {
    user.hasZapped = true;
    user.save();
  }
}

export function handleAddLiquidityYT(event: AddLiquidityYT): void {
  let pair: Pair = getTokenPair(
    event.params.token0,
    event.params.token1
  ) as Pair;
  let volumeUSD = handleJoinInfo(
    Address.fromHexString(pair.id) as Address,
    event.params.token0Amount,
    event.params.token1Amount,
    event.params.exactOutLp,
    event.params.sender,
    event
  );
  let zapVolume = getZapVolume(event.block.timestamp);
  zapVolume.volumeUSD = zapVolume.volumeUSD.plus(volumeUSD);
  zapVolume.save();
  let user = loadUser(event.params.sender);
  if (user.hasZapped === false) {
    user.hasZapped = true;
    user.save();
  }
}
