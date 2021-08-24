import { Address, ethereum } from "@graphprotocol/graph-ts";
import { LpHolder, Pair, Token } from "../../generated/schema";
import { Transfer as TransferEvent } from "../../generated/templates/ERC20/ERC20";
import { loadUserMarketData } from "../pendle/market";
import { getUniswapTokenPrice } from "../uniswap/pricing";
import {
  convertTokenToDecimal,
  getLpPrice,
  printDebug
} from "../utils/helpers";

export function handleTransferProxy(event: TransferEvent): void {
  let from = event.params.from.toHexString();
  let sender = LpHolder.load(from);
  if (sender == null) return;
  let token = Token.load(event.address.toHexString());
  let userInfo = loadUserMarketData(
    event.params.to,
    Address.fromHexString(sender.market) as Address
  );
  userInfo.yieldClaimedRaw = userInfo.yieldClaimedRaw.plus(
    convertTokenToDecimal(event.params.value, token.decimals)
  );
  userInfo.yieldClaimedUsd = userInfo.yieldClaimedRaw.times(
    getUniswapTokenPrice(token as Token)
  );
  userInfo.save();
}
