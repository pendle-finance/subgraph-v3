import {
  BigInt,
  Address,
  ByteArray,
  BigDecimal,
  log,
} from "@graphprotocol/graph-ts";
import {
  SwapEvent,
  Join as JoinLiquidityPoolEvent,
  Exit as ExitLiquidityPoolEvent,
  PendleRouter as PendleRouterContract,
  MarketCreated as MarketCreatedEvent,
} from "../generated/PendleRouter/PendleRouter";
import {
  MintYieldToken as MintYieldTokenEvent,
  NewYieldContracts as NewYieldContractsEvent,
  RedeemYieldToken as RedeemYieldTokenEvent,
} from "../generated/templates/IPendleForge/IPendleForge";
import {
  IPendleForge as PendleForgeTemplate,
  PendleMarket as PendleMarketTemplate,
} from "../generated/templates";
import {
  Sync as SyncEvent,
  PendleMarket as PendleMarketContract,
  // Mint as MintLPTokenEvent,
} from "../generated/templates/PendleMarket/PendleMarket";
import {
  ERC20,
  Transfer as TransferEvent,
} from "../generated/templates/PendleMarket/ERC20";
import {
  PendleData as PendleDataContract,
  ForgeAdded as NewForgeEvent,
  NewMarketFactory as NewMarketFactoryEvent,
} from "../generated/templates/PendleMarket/PendleData";

import {
  Forge,
  Token,
  YieldContract,
  MintYieldToken,
  RedeemYieldToken,
  Pair,
  Transaction,
  MintLPToken,
  Swap,
  PendleData,
  LiquidityPool,
  MarketFactory,
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
  loadUser,
  createLiquidityPosition,
  createLiquiditySnapshot,
} from "./helpers";

/* ** MISC Functions */
/**
 * @dev Loads pendle data, if none exists automatically creates new one.
 * When loading Pendle Data it will always fetch the latest swap and exit fee
 * directly from the contract to get latest results.
 *
 */
function loadPendleData(): PendleData {
  let pendleData = PendleData.load("1");
  let pendleContract = PendleDataContract.bind(
    Address.fromHexString(
      "0x6B827d177BDe594f224FFd13F2d4D09D5b8Eb56D"
    ) as Address
  );
  if (pendleData === null) {
    pendleData = new PendleData("1");
  }

  pendleData.swapFee = pendleContract
    .swapFee()
    .toBigDecimal()
    .div(BigDecimal.fromString("100"));
  pendleData.exitFee = ZERO_BD;

  // pendleContract
  //   .exitFee()
  //   .toBigDecimal()
  //   .div(BigDecimal.fromString("100"));

  pendleData.save();
  return pendleData as PendleData;
}

/** PENDLE ROUTER EVENTS */
export function handleNewForge(event: NewForgeEvent): void {
  let forge = new Forge(event.params.forgeAddress.toHexString());
  forge.forgeId = event.params.forgeId.toString();
  forge.save();

  PendleForgeTemplate.create(event.params.forgeAddress);
}

export function handleSwap(event: SwapEvent): void {
  let pair = Pair.load(event.params.market.toHexString());
  let inToken = Token.load(event.params.inToken.toHexString());
  let outToken = Token.load(event.params.outToken.toHexString());
  let amountIn = convertTokenToDecimal(event.params.exactIn, inToken.decimals);
  let amountOut = convertTokenToDecimal(
    event.params.exactOut,
    outToken.decimals
  );
  let pendleData = loadPendleData();

  // @TODO Find a way to calculate USD amount
  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)

  if (inToken.symbol == "USDT") {
    derivedAmountUSD = amountIn;
  } else if (outToken.symbol == "USDT") {
    derivedAmountUSD = amountOut;
  }

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = ZERO_BD; // getTrackedVolumeUSD(amount0Total, token0 as Token, amount1Total, token1 as Token, pair as Pair)

  // update inToken global volume and token liquidity stats
  inToken.tradeVolume = inToken.tradeVolume.plus(amountIn);
  inToken.tradeVolumeUSD = inToken.tradeVolumeUSD.plus(derivedAmountUSD);

  // update outToken global volume and token liquidity stats
  outToken.tradeVolume = outToken.tradeVolume.plus(amountOut);
  outToken.tradeVolumeUSD = outToken.tradeVolumeUSD.plus(derivedAmountUSD);
  // update txn counts
  inToken.txCount = inToken.txCount.plus(ONE_BI);

  outToken.txCount = outToken.txCount.plus(ONE_BI);
  pair.txCount = pair.txCount.plus(ONE_BI);

  // Calculate and update collected fees
  let tokenFee = amountIn.times(pendleData.swapFee);
  let usdFee = derivedAmountUSD.times(pendleData.swapFee);

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  pair.volumeUSD = pair.volumeUSD.plus(derivedAmountUSD);

  if (inToken.id == pair.token0) {
    pair.volumeToken0 = pair.volumeToken0.plus(amountIn);
    pair.volumeToken1 = pair.volumeToken1.plus(amountOut);
    pair.feesToken0 = pair.feesToken0.plus(tokenFee);
  } else if (inToken.id == pair.token1) {
    pair.volumeToken1 = pair.volumeToken1.plus(amountIn);
    pair.volumeToken0 = pair.volumeToken0.plus(amountOut);
    pair.feesToken1 = pair.feesToken1.plus(tokenFee);
  }

  pair.feesUSD = pair.feesUSD.plus(usdFee);

  // save entities
  pair.save();
  inToken.save();
  outToken.save();

  // Create Swap Entity
  let swap = new Swap(event.transaction.hash.toHexString());
  swap.timestamp = event.block.timestamp;
  swap.pair = pair.id;

  swap.sender = event.params.trader;
  swap.from = event.transaction.from;
  swap.inToken = inToken.id;
  swap.outToken = outToken.id;
  swap.inAmount = amountIn;
  swap.outAmount = amountOut;
  swap.to = event.params.trader;
  swap.logIndex = event.logIndex;
  swap.feesCollected = tokenFee;
  swap.feesCollectedUSD = usdFee;
  // use the tracked amount if we have it
  swap.amountUSD = derivedAmountUSD;

  swap.save();
}

export function handleJoinLiquidityPool(event: JoinLiquidityPoolEvent): void {
  let pair = Pair.load(event.params.market.toHexString());
  log.debug("pairID: {}", [pair.id]);
  log.debug("pair token0: {}", [pair.token0]);
  log.debug("pair token1: {}", [pair.token1]);

  let inToken0 = Token.load(pair.token0);
  let inToken1 = Token.load(pair.token1);
  let inAmount0 = convertTokenToDecimal(
    event.params.token0Amount,
    inToken0.decimals
  );
  let inAmount1 = convertTokenToDecimal(
    event.params.token1Amount,
    inToken1.decimals
  );

  // @TODO Find a way to calculate USD amount
  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)

  if (inToken1.symbol == "USDT" || inToken1.symbol == "USDC") {
    derivedAmountUSD = inAmount1.times(BigDecimal.fromString("2"));
  }

  // Calculate and update collected fees
  let tokenFee = ZERO_BD;
  let usdFee = ZERO_BD;

  // update pair volume data, use tracked amount if we have it as its probably more accurate

  // Create LiquidityPool Entity
  let liquidityPool = new LiquidityPool(event.transaction.hash.toHexString());
  liquidityPool.timestamp = event.block.timestamp;
  liquidityPool.pair = pair.id;
  liquidityPool.type = "Join";

  liquidityPool.from = event.params.sender;
  liquidityPool.inToken0 = inToken0.id;
  liquidityPool.inToken1 = inToken1.id;
  liquidityPool.inAmount0 = inAmount0;
  liquidityPool.inAmount1 = inAmount1;
  liquidityPool.feesCollected = tokenFee;
  liquidityPool.feesCollectedUSD = usdFee;
  // use the tracked amount if we have it
  liquidityPool.amountUSD = derivedAmountUSD;

  liquidityPool.save();
}

export function handleExitLiquidityPool(event: ExitLiquidityPoolEvent): void {
  let pair = Pair.load(event.params.market.toHexString());
  let inToken0 = Token.load(pair.token0);
  let inToken1 = Token.load(pair.token1);
  let inAmount0 = convertTokenToDecimal(
    event.params.token0Amount,
    inToken0.decimals
  );
  let inAmount1 = convertTokenToDecimal(
    event.params.token1Amount,
    inToken1.decimals
  );

  // @TODO Find a way to calculate USD amount
  let derivedAmountUSD = ZERO_BD; //derivedAmountETH.times(bundle.ethPrice)

  if (inToken1.symbol == "USDT" || inToken1.symbol == "USDC") {
    derivedAmountUSD = inAmount1.times(BigDecimal.fromString("2"));
  }

  // Calculate and update collected fees
  let tokenFee = ZERO_BD;
  let usdFee = ZERO_BD;

  // update pair volume data, use tracked amount if we have it as its probably more accurate

  // Create LiquidityPool Entity
  let liquidityPool = new LiquidityPool(event.transaction.hash.toHexString());
  liquidityPool.timestamp = event.block.timestamp;
  liquidityPool.pair = pair.id;
  liquidityPool.type = "Exit";

  liquidityPool.from = event.params.sender;
  liquidityPool.inToken0 = inToken0.id;
  liquidityPool.inToken1 = inToken1.id;
  liquidityPool.inAmount0 = inAmount0;
  liquidityPool.inAmount1 = inAmount1;
  liquidityPool.feesCollected = tokenFee;
  liquidityPool.feesCollectedUSD = usdFee;
  // use the tracked amount if we have it
  liquidityPool.amountUSD = derivedAmountUSD;

  liquidityPool.save();
}

export function handleNewMarketFactory(event: NewMarketFactoryEvent): void {
  let newMarketFactory = new MarketFactory(
    event.params.marketFactoryId.toString()
  );
  newMarketFactory.address = event.params.marketFactoryAddress.toHexString();
  newMarketFactory.save();
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

  let xytToken = Token.load(yieldContract.xyt);
  let otToken = Token.load(yieldContract.ot);

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
    xytToken.decimals
  );
  mintYieldToken.expiry = event.params.expiry;
  mintYieldToken.from = event.transaction.from;
  mintYieldToken.underlyingAsset = underlyingToken.id;
  mintYieldToken.yieldContract = yieldContract.id;
  mintYieldToken.save();
}

export function handleRedeemYieldContracts(event: RedeemYieldTokenEvent): void {
  let forgeId = event.params.forgeId.toString();
  let underlyingToken = Token.load(event.params.underlyingAsset.toHexString());
  let yieldContractid =
    forgeId + "-" + underlyingToken.id + "-" + event.params.expiry.toString();
  let yieldContract = YieldContract.load(yieldContractid);

  // Getting the mint volume
  let newRedeenVolume = convertTokenToDecimal(
    event.params.redeemedAmount,
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

  mintYieldToken.forgeId = forgeId;
  mintYieldToken.amountRedeemed = convertTokenToDecimal(
    event.params.redeemedAmount,
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
    // let token0Price = pendleMarketContract.try_swapExactIn(
    //   ByteArray.fromHexString(token0.id) as Address,
    //   ONE_BI,
    //   ByteArray.fromHexString(token1.id) as Address,
    //   ZERO_BI
    // );
    // let token1Price = pendleMarketContract.try_swapExactIn(
    //   ByteArray.fromHexString(token1.id) as Address,
    //   ONE_BI,
    //   ByteArray.fromHexString(token0.id) as Address,
    //   ZERO_BI
    // );
    // pair.token0Price = convertTokenToDecimal(
    //   token0Price.value.value0,
    //   BigInt.fromI32(12)
    // );
    // pair.token1Price = convertTokenToDecimal(
    //   token1Price.value.value0,
    //   BigInt.fromI32(12)
    // );
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

/**
 * @dev Handles tracking of joining and exiting liquidity of market
 */
export function handleTransfer(event: TransferEvent): void {
  // user stats
  let from = loadUser(event.params.from);
  let to = loadUser(event.params.to);

  let pair = Pair.load(event.address.toHexString());
  let pairContract = ERC20.bind(event.address);
  let token = Token.load(event.address.toHexString());
  let value = convertTokenToDecimal(event.params.value, BI_18);

  if (token === null) {
    token = generateNewToken(event.address);
  }

  let transactionHash = event.transaction.hash.toHexString();

  // get or create transaction
  let transaction = Transaction.load(transactionHash);
  if (transaction === null) {
    transaction = new Transaction(transactionHash);
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.lpMints = [];
    transaction.lpBurns = [];
    transaction.swaps = [];
    transaction.mintYieldTokens = [];
    transaction.redeemYieldTokens = [];
  }

  /**
   * @dev Mints LP Token
   */
  let mints = transaction.lpMints;
  if (from.id == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value);
    pair.save();

    // create new mint if no mints so far
    if (mints.length === 0) {
      let mint = new MintLPToken(
        event.transaction.hash
          .toHexString()
          .concat("-")
          .concat(BigInt.fromI32(mints.length).toString())
      );
      mint.transaction = transaction.id;
      mint.pair = pair.id;
      mint.to = event.params.to;
      mint.liquidity = value;
      mint.timestamp = transaction.timestamp;
      mint.transaction = transaction.id;
      mint.save();

      // update mints in transaction
      transaction.lpMints = mints.concat([mint.id]);

      // save entities
      transaction.save();
    }
  }

  /**
   * wallet address = 0xE8A4095437dd20a01e66115dE33164eBCEA9B09a
   * market factory address = 0x2d0DaF52777D6Fd2A7233E693320BF519CFA9B01
   */

  /**
   * @dev User removing liquidity
   */
  if (from.id != ADDRESS_ZERO && from.id != pair.id) {
    // log.debug("handle transfer and sync, this is remove liquidity", []);
    pair.totalSupply = pair.totalSupply.minus(value);
    pair.save();
    let fromUserLiquidityPosition = createLiquidityPosition(
      event.address,
      event.params.from
    );
    fromUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(
      pairContract.balanceOf(event.params.from),
      BI_18
    );
    fromUserLiquidityPosition.save();
    // createLiquiditySnapshot(
    //   fromUserLiquidityPosition,
    //   event,
    //   "remove",
    //   value.neg()
    // );
  }

  /**
   * @dev User adding liquidity
   */
  if (
    to.id != ADDRESS_ZERO &&
    to.id != pair.id &&
    to.id != "0x85eb31dd2ddf092672ee819cb1f401efe63fe2c0" //Market factory
  ) {
    let toUserLiquidityPosition = createLiquidityPosition(
      event.address,
      event.params.to
    );
    toUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(
      pairContract.balanceOf(event.params.to),
      BI_18
    );
    toUserLiquidityPosition.save();
    // createLiquiditySnapshot(toUserLiquidityPosition, event, "add", value);
  }
}
