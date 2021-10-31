import { Address, ethereum } from "@graphprotocol/graph-ts";
import {
  AddLiquidityYT,
  SwapEventYT
} from "../../generated/PendleWrapper/PendleWrapper";
import { Pair } from "../../generated/schema";
import { getTokenPair } from "../utils/helpers";
import { handleJoinInfo, handleSwapInfo } from "./market/marketEventRouter";

export function handleSwapEventYT(event: SwapEventYT): void {
  let pair: Pair = getTokenPair(
    event.params.inToken,
    event.params.outToken
  ) as Pair;
  handleSwapInfo(
    Address.fromHexString(pair.id) as Address,
    event.params.inToken,
    event.params.outToken,
    event.params.inAmount,
    event.params.outAmount,
    event.params.user,
    event
  );
}

export function handleAddLiquidityYT(event: AddLiquidityYT): void {
  let pair: Pair = getTokenPair(
    event.params.token0,
    event.params.token1
  ) as Pair;
  handleJoinInfo(
    Address.fromHexString(pair.id) as Address,
    event.params.token0Amount,
    event.params.token1Amount,
    event.params.exactOutLp,
    event.params.sender,
    event
  );
}
