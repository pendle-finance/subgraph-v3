import { Transfer as TransferEvent } from "../../generated/Pendle/ERC20";
import { PendleHolder } from "../../generated/schema";
import { getPendlePrice } from "../sushiswap/factory";
import { PENDLE_TOKEN_ADDRESS } from "../utils/consts";
import { convertTokenToDecimal, loadToken, loadUser } from "../utils/helpers";

export function handleTransfer(event: TransferEvent): void {
  let from = event.params.from.toHexString();
  let sender = PendleHolder.load(from);
  if (sender == null) return;

  let token = loadToken(PENDLE_TOKEN_ADDRESS);
  let user = loadUser(event.params.to);
  let amount = convertTokenToDecimal(event.params.value, token.decimals);
  let pendlePrice = getPendlePrice();

  user.pendleClaimed = user.pendleClaimed.plus(amount);
  user.pendleClaimedUSD = user.pendleClaimed.times(pendlePrice);
  user.save();
}
