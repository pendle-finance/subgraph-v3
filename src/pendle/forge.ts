import { Address, ByteArray, log } from "@graphprotocol/graph-ts";
import {
  MintYieldToken,
  RedeemYieldToken,
  Token,
  YieldContract
} from "../../generated/schema";
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
  generateNewToken
} from "../utils/helpers";
import { mintActionNFT } from "../utils/nft";

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

  yieldBearingToken.forgeId = forgeId;
  yieldBearingToken.underlyingAsset = underlyingToken.id;
  yieldBearingToken.type = "yieldBearing";

  log.debug("Ownership token!!: {}", [otToken.id]);

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

export function handleMintYieldToken(event: MintYieldTokenEvent): void {
  let underlyingToken = Token.load(event.params.underlyingAsset.toHexString());
  let forgeId = event.params.forgeId.toString();
  let yieldContractid =
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString();
  let yieldContract = YieldContract.load(yieldContractid);
  let xytToken = Token.load(yieldContract.xyt);
  let otToken = Token.load(yieldContract.ot);
  let yieldBearingToken = Token.load(yieldContract.yieldBearingAsset);
  let yieldTokenPrice = getUniswapTokenPrice(yieldBearingToken as Token);

  // Getting the mint volume
  let newMintVolume = convertTokenToDecimal(
    event.params.amountToTokenize,
    yieldBearingToken.decimals
  );

  let newMintVolumeUSD = newMintVolume.times(yieldTokenPrice);

  yieldContract.lockedVolume = yieldContract.lockedVolume.plus(newMintVolume);
  yieldContract.mintVolume = yieldContract.mintVolume.plus(newMintVolume);
  underlyingToken.mintVolume = underlyingToken.mintVolume.plus(newMintVolume);

  yieldContract.lockedVolumeUSD = yieldContract.lockedVolume.times(
    yieldTokenPrice
  );
  yieldContract.mintVolumeUSD = yieldContract.mintVolume.times(yieldTokenPrice);

  underlyingToken.txCount = underlyingToken.txCount.plus(ONE_BI);
  yieldContract.mintTxCount = yieldContract.mintTxCount.plus(ONE_BI);
  underlyingToken.save();
  yieldContract.save();

  //Updating OT and XYT total supply
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
  mintYieldToken.mintedValueUSD = newMintVolumeUSD;

  mintYieldToken.blockNumber = event.block.number;
  mintYieldToken.timestamp = event.block.timestamp;

  mintYieldToken.forgeId = forgeId;
  mintYieldToken.amountToTokenize = newMintVolume;
  mintYieldToken.amountMinted = convertTokenToDecimal(
    event.params.amountTokenMinted,
    xytToken.decimals
  );

  mintYieldToken.expiry = event.params.expiry;
  mintYieldToken.from = event.transaction.from;
  mintYieldToken.underlyingAsset = underlyingToken.id;
  mintYieldToken.yieldContract = yieldContract.id;
  mintYieldToken.yieldBearingAsset = yieldContract.yieldBearingAsset;
  mintYieldToken.xytAsset = xytToken.id;
  mintYieldToken.otAsset = otToken.id;
  mintYieldToken.save();

  mintActionNFT(
    event.params.user,
    event.params.underlyingAsset,
    newMintVolumeUSD,
    event.block.timestamp.toI32()
  );
}

export function handleRedeemYieldContracts(event: RedeemYieldTokenEvent): void {
  let forgeId = event.params.forgeId.toString();
  let underlyingToken = Token.load(event.params.underlyingAsset.toHexString());
  let yieldContractid =
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString();
  let yieldContract = YieldContract.load(yieldContractid);
  let yieldBearingToken = Token.load(yieldContract.yieldBearingAsset);

  // Getting the mint volume
  let newRedeenVolume = convertTokenToDecimal(
    event.params.redeemedAmount,
    yieldBearingToken.decimals
  );

  let yieldTokenPrice = getUniswapTokenPrice(yieldBearingToken as Token);
  let newRedeenVolumeUSD = newRedeenVolume.times(yieldTokenPrice);

  yieldContract.redeemVolume = yieldContract.redeemVolume.plus(newRedeenVolume);
  yieldContract.lockedVolume = yieldContract.lockedVolume.minus(
    newRedeenVolume
  );
  underlyingToken.redeemVolume = underlyingToken.redeemVolume.plus(
    newRedeenVolume
  );

  yieldContract.redeemVolumeUSD = yieldContract.redeemVolume.times(
    yieldTokenPrice
  );
  yieldContract.lockedVolumeUSD = yieldContract.lockedVolume.times(
    yieldTokenPrice
  );

  underlyingToken.txCount = underlyingToken.txCount.plus(ONE_BI);
  yieldContract.redeemTxCount = yieldContract.redeemTxCount.plus(ONE_BI);
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
  let redeemYieldToken = new RedeemYieldToken(
    event.transaction.hash.toHexString()
  );

  redeemYieldToken.redeemedValueUSD = newRedeenVolumeUSD;

  redeemYieldToken.blockNumber = event.block.number;
  redeemYieldToken.timestamp = event.block.timestamp;

  redeemYieldToken.forgeId = forgeId;
  redeemYieldToken.amountRedeemed = newRedeenVolume;

  redeemYieldToken.amountToRedeem = convertTokenToDecimal(
    event.params.amountToRedeem,
    xytToken.decimals
  );
  redeemYieldToken.expiry = event.params.expiry;
  redeemYieldToken.from = event.transaction.from;
  redeemYieldToken.underlyingAsset = underlyingToken.id;
  redeemYieldToken.yieldBearingAsset = yieldContract.yieldBearingAsset;
  redeemYieldToken.yieldContract = yieldContract.id;
  redeemYieldToken.xytAsset = xytToken.id;
  redeemYieldToken.otAsset = otToken.id;
  redeemYieldToken.save();
}
