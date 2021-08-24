import { NewAddress as NewAddressEvent } from "../../generated/Directory/Directory";
import { LiquidityMiningV2 as LM2Contract } from "../../generated/Directory/LiquidityMiningV2";
import { LiquidityMining, PendleHolder } from "../../generated/schema";
import { PendleLiquidityMiningV2 } from "../../generated/templates";
import { printDebug } from "../utils/helpers";

export function handleNewContractAddress(event: NewAddressEvent): void {
  let addressNote = event.params.contractType.toString();
  let newAddress = event.params.contractAddress;
  if (addressNote == "LiqMiningV2") {
    let lmContract = LM2Contract.bind(newAddress);
    let token = lmContract.stakeToken();
    let lmInstance = new LiquidityMining(token.toHexString());
    lmInstance.lmAddress = newAddress.toHexString();
    lmInstance.save();
    PendleLiquidityMiningV2.create(newAddress);

    let holder = new PendleHolder(lmInstance.lmAddress);
    holder.save();
  }
}
