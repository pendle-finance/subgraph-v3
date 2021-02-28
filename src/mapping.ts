import { BigInt, Address, ByteArray } from "@graphprotocol/graph-ts";
import { NewForge as NewForgeEvent } from "../generated/PendleRouter/PendleRouter";
import {
  MintYieldToken as MintYieldTokenEvent,
  NewYieldContracts as NewYieldContractsEvent,
  RedeemYieldToken as RedeemYieldTokenEvent,
} from "../generated/templates/IPendleForge/IPendleForge";
import { MarketCreated as MarketCreatedEvent } from "../generated/PendleMarketFactory/PendleMarketFactory";
import {
  IPendleForge as PendleForgeTemplate,
  PendleMarket as PendleMarketTemplate,
} from "../generated/templates";
import {
  Sync as SyncEvent,
  // Swap as SwapEvent,
  PendleMarket as PendleMarketContract,
  // Mint as MintLPTokenEvent,
} from "../generated/templates/PendleMarket/PendleMarket";
import {
  Forge,
  Token,
  YieldContract,
  MintYieldToken,
  RedeemYieldToken,
  Pair,
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

// export function handleNewMarketFactory(event): void {}

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

export function handleRedeemYieldContracts(event: RedeemYieldTokenEvent): void {
  let underlyingToken = Token.load(event.params.underlyingAsset.toHexString());
  let yieldContractid =
    event.params.forgeId.toString() +
    "-" +
    underlyingToken.id +
    "-" +
    event.params.expiry.toString();
  let yieldContract = YieldContract.load(yieldContractid);

  // Getting the mint volume
  let newRedeenVolume = convertTokenToDecimal(
    event.params.amount,
    underlyingToken.decimals
  );

  yieldContract.redeemVolume = yieldContract.mintVolume.plus(newRedeenVolume);
  underlyingToken.redeemVolume = underlyingToken.mintVolume.plus(
    newRedeenVolume
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
  let mintYieldToken = new RedeemYieldToken(
    event.transaction.hash.toHexString()
  );
  mintYieldToken.blockNumber = event.block.number;
  mintYieldToken.timestamp = event.block.timestamp;

  mintYieldToken.forgeId = event.params.forgeId;
  mintYieldToken.amountRedeemed = convertTokenToDecimal(
    event.params.amount,
    BigInt.fromI32(6)
  );
  mintYieldToken.expiry = event.params.expiry;
  mintYieldToken.from = event.transaction.from;
  mintYieldToken.underlyingAsset = underlyingToken.id;
  mintYieldToken.yieldContract = yieldContract.id;
  mintYieldToken.save();
}

/* ** PENDLE MARKET FACTORY EVENTS */

export function handleMarketCreated(event: MarketCreatedEvent): void {
  // create the tokens
  let token0 = Token.load(event.params.xyt.toHexString());
  let token1 = Token.load(event.params.token.toHexString());

  // fetch info if null
  if (token0 === null) {
    token0 = generateNewToken(event.params.xyt);
  }

  // fetch info if null
  if (token1 === null) {
    token1 = generateNewToken(event.params.token);
  }

  // Bailing if token0 or token1 is still null
  if (token0 === null || token1 === null) {
    return;
  }

  let pair = new Pair(event.params.market.toHexString());

  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.liquidityProviderCount = ZERO_BI;
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  pair.txCount = ZERO_BI;
  pair.feesToken0 = ZERO_BD;
  pair.feesToken1 = ZERO_BD;
  pair.feesUSD = ZERO_BD;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  pair.volumeToken0 = ZERO_BD;
  pair.volumeToken1 = ZERO_BD;
  pair.volumeUSD = ZERO_BD;
  // pair.untrackedVolumeUSD = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;

  // create the tracked contract based on the template
  PendleMarketTemplate.create(event.params.market);

  // save updated values
  token0.save();
  token1.save();
  pair.save();
}

/*** PENDLE MARKET EVENTS */

/***
 * @dev Updates market reserves and token prices
 *  */
export function handleSync(event: SyncEvent): void {
  let pair = Pair.load(event.address.toHex());
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);

  /* Fetches spot price*/
  let pendleMarketContract = PendleMarketContract.bind(event.address);
  if (pair.reserve0.notEqual(ZERO_BD) && pair.reserve1.notEqual(ZERO_BD)) {
    pair.token0Price = convertTokenToDecimal(
      pendleMarketContract.spotPrice(
        ByteArray.fromHexString(token0.id) as Address,
        ByteArray.fromHexString(token1.id) as Address
      ),
      BigInt.fromI32(12)
    );
    pair.token1Price = convertTokenToDecimal(
      pendleMarketContract.spotPrice(
        ByteArray.fromHexString(token1.id) as Address,
        ByteArray.fromHexString(token0.id) as Address
      ),
      BigInt.fromI32(12)
    );
  } else {
    pair.token0Price = ZERO_BD;
    pair.token1Price = ZERO_BD;
  }

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  // save entities
  pair.save();
  token0.save();
  token1.save();
}
