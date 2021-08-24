import { Address, ByteArray, log } from "@graphprotocol/graph-ts";
import {
  MintYieldToken,
  RedeemYieldToken,
  Token,
  YieldContract
} from "../../generated/schema";
import { ERC20 } from "../../generated/templates";
import {
  NewYieldContracts as NewYieldContractsEvent,
  MintYieldTokens as MintYieldTokenEvent,
  RedeemYieldToken as RedeemYieldTokenEvent
} from "../../generated/templates/IPendleForge/IPendleForge";
import { getUniswapTokenPrice } from "../uniswap/pricing";
import { ONE_BI, ZERO_BD, ZERO_BI } from "../utils/consts";
import {
  convertTokenToDecimal,
  fetchTokenTotalSupply,
  generateNewToken,
  printDebug
} from "../utils/helpers";

export function handleNewYieldContracts(event: NewYieldContractsEvent): void {
  let forgeId = event.params.forgeId.toString();
  let underlyingToken = generateNewToken(event.params.underlyingAsset);
  let yieldBearingToken = generateNewToken(event.params.yieldBearingAsset);
  let xytToken = generateNewToken(event.params.xyt);
  let otToken = generateNewToken(event.params.ot);

  // Setting up yield tokens
  xytToken.forgeId = forgeId;
  xytToken.underlyingAsset = yieldBearingToken.id;
  xytToken.type = "yt";

  otToken.forgeId = forgeId;
  otToken.underlyingAsset = yieldBearingToken.id;
  otToken.type = "ot";

  if (yieldBearingToken.forgeId == null) {
    /// newly created
    ERC20.create(event.params.yieldBearingAsset);
  }

  yieldBearingToken.forgeId = forgeId;
  yieldBearingToken.underlyingAsset = underlyingToken.id;
  yieldBearingToken.type = "yieldBearing";

  xytToken.save();
  otToken.save();
  yieldBearingToken.save();

  if (xytToken === null || otToken === null) return;

  let yieldContract = new YieldContract(
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString()
  );
  yieldContract.forgeId = forgeId;

  yieldContract.underlyingAsset = underlyingToken.id;
  yieldContract.yieldBearingAsset = yieldBearingToken.id;
  yieldContract.xyt = xytToken.id;
  yieldContract.ot = otToken.id;
  yieldContract.expiry = event.params.expiry;

  yieldContract.mintTxCount = ZERO_BI;
  yieldContract.redeemTxCount = ZERO_BI;
  yieldContract.interestSettledTxCount = ZERO_BI;

  // Volume
  yieldContract.lockedVolume = ZERO_BD;
  yieldContract.mintVolume = ZERO_BD;
  yieldContract.redeemVolume = ZERO_BD;

  // Volume USD
  yieldContract.lockedVolumeUSD = ZERO_BD;
  yieldContract.mintVolumeUSD = ZERO_BD;
  yieldContract.redeemVolumeUSD = ZERO_BD;

  yieldContract.interestSettledVolume = ZERO_BD;

  yieldContract.save();
  xytToken.save();
  otToken.save();
  underlyingToken.save();
  yieldBearingToken.save();
}
