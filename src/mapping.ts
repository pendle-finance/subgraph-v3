import { NewForge as NewForgeEvent } from "../generated/PendleRouter/PendleRouter";
import {
  MintYieldToken as MintYieldTokenEvent,
  NewYieldContracts as NewYieldContractsEvent,
  RedeemYieldToken as RedeemYieldTokenEvent,
} from "../generated/templates/IPendleForge/IPendleForge";
import { IPendleForge as PendleForgeTemplate } from "../generated/templates";
import { Forge, YieldContract } from "../generated/schema";
import {
  convertTokenToDecimal,
  ZERO_BD,
  ZERO_BI,
  ONE_BI,
  BI_18,
  ADDRESS_ZERO,
  // fetchTokenSymbol,
  // fetchTokenName,
  // fetchTokenDecimals,
  fetchTokenTotalSupply,
  generateNewToken,
  // loadUser,
  // createLiquidityPosition,
  // createLiquiditySnapshot,
} from "./helpers";

/** PENDLE ROUTER EVENTS */
export function handleNewForge(event: NewForgeEvent): void {
  let forge = new Forge(event.params.forgeAddress.toHexString());
  forge.forgeId = event.params.forgeId.toString();

  forge.save();

  PendleForgeTemplate.create(event.params.forgeAddress);
}

export function handleNewYieldContracts(event: NewYieldContractsEvent): void {
  let xytToken = generateNewToken(event.params.xyt);
  let otToken = generateNewToken(event.params.ot);
  let underlyingToken = generateNewToken(event.params.underlyingAsset);

  if (xytToken === null || otToken === null) return;
  let forgeId = event.params.forgeId.toString();

  let yieldContract = new YieldContract(
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString()
  );
  yieldContract.forgeId = forgeId;

  yieldContract.underlyingAsset = underlyingToken.id;
  yieldContract.xyt = xytToken.id;
  yieldContract.ot = otToken.id;
  yieldContract.expiry = event.params.expiry;

  yieldContract.mintTxCount = ZERO_BI;
  yieldContract.redeemTxCount = ZERO_BI;
  yieldContract.interestSettledTxCount = ZERO_BI;

  yieldContract.mintVolume = ZERO_BD;
  yieldContract.redeemVolume = ZERO_BD;
  yieldContract.interestSettledVolume = ZERO_BD;

  yieldContract.save();
  xytToken.save();
  otToken.save();
  underlyingToken.save();
}
