import { BigInt, Address, ByteArray } from "@graphprotocol/graph-ts";
import { NewForge as NewForgeEvent } from "../generated/PendleRouter/PendleRouter";
import {
  MintYieldToken as MintYieldTokenEvent,
  NewYieldContracts as NewYieldContractsEvent,
  RedeemYieldToken as RedeemYieldTokenEvent,
} from "../generated/templates/IPendleForge/IPendleForge";
import { IPendleForge as PendleForgeTemplate } from "../generated/templates";
import {
  Forge,
  YieldContract,
  Token,
  MintYieldToken,
} from "../generated/schema";
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

/* ** PENDLE FORGE EVENTS */
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

export function handleMintYieldToken(event: MintYieldTokenEvent): void {
  let underlyingToken = Token.load(event.params.underlyingAsset.toHexString());
  let forgeId = event.params.forgeId.toString();
  let yieldContractid =
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString();
  let yieldContract = YieldContract.load(yieldContractid);

  // Getting the mint volume
  let newMintVolume = convertTokenToDecimal(
    event.params.amount,
    underlyingToken.decimals
  );

  yieldContract.mintVolume = yieldContract.mintVolume.plus(newMintVolume);
  underlyingToken.mintVolume = underlyingToken.mintVolume.plus(newMintVolume);

  underlyingToken.txCount = underlyingToken.txCount.plus(ONE_BI);
  yieldContract.mintTxCount = yieldContract.mintTxCount.plus(ONE_BI);
  underlyingToken.save();
  yieldContract.save();

  //Updating OT and XYT total supply
  let xytToken = Token.load(yieldContract.xyt);
  let otToken = Token.load(yieldContract.ot);

  xytToken.totalSupply = fetchTokenTotalSupply(
    ByteArray.fromHexString(yieldContract.xyt) as Address
  );
  otToken.totalSupply = fetchTokenTotalSupply(
    ByteArray.fromHexString(yieldContract.ot) as Address
  );

  xytToken.save();
  otToken.save();

  // Creating new MintYieldToken entity
  let mintYieldToken = new MintYieldToken(event.transaction.hash.toHexString());
  mintYieldToken.blockNumber = event.block.number;
  mintYieldToken.timestamp = event.block.timestamp;

  mintYieldToken.forgeId = forgeId;
  mintYieldToken.amountMinted = convertTokenToDecimal(
    event.params.amount,
    BigInt.fromI32(6)
  );
  mintYieldToken.expiry = event.params.expiry;
  mintYieldToken.from = event.transaction.from;
  mintYieldToken.underlyingAsset = underlyingToken.id;
  mintYieldToken.yieldContract = yieldContract.id;
  mintYieldToken.save();
}
