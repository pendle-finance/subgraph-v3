import {
  log,
  BigInt,
  BigDecimal,
  Address,
  ethereum
} from "@graphprotocol/graph-ts";
import {
  ERC20,
  Transfer as TransferEvent
} from "../../generated/templates/PendleMarket/ERC20";
import { ERC20SymbolBytes } from "../../generated/templates/IPendleForge/ERC20SymbolBytes";
import { ERC20NameBytes } from "../../generated/templates/IPendleForge/ERC20NameBytes";
import {
  Token,
  User,
  LiquidityPosition,
  LiquidityPositionSnapshot,
  Pair,
  DebugLog,
  PendleData,
  LiquidityMining
} from "../../generated/schema";
import { PendleMarket as PendleMarketContract } from "../../generated/templates/PendleMarket/PendleMarket";
import {
  DAYS_PER_WEEK_BD,
  DAYS_PER_YEAR_BD,
  LM_ALLOC_DENOM,
  ONE_BD,
  ONE_BI,
  PENDLE_TOKEN_ADDRESS,
  RONE,
  RONE_BD,
  TWO_BD,
  ZERO_BD,
  ZERO_BI
} from "./consts";
import { getUniswapTokenPrice } from "../uniswap/pricing";
import { PendleLiquidityMiningV1 as PendleLm1Contract } from "../../generated/templates/PendleLiquidityMiningV1/PendleLiquidityMiningV1";
import { getPendlePrice } from "../sushiswap/factory";
import { SushiswapPair } from "../../generated/templates/SushiswapPair/SushiswapPair";

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function isNullEthValue(value: string): boolean {
  return (
    value ==
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  // hard coded overrides
  if (
    tokenAddress.toHexString() == "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a"
  ) {
    return "DGD";
  }
  if (
    tokenAddress.toHexString() == "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"
  ) {
    return "AAVE";
  }

  let contract = ERC20.bind(tokenAddress);
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress);

  // try types string and bytes32 for symbol
  let symbolValue = "unknown";
  let symbolResult = contract.try_symbol();
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol();
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString();
      }
    }
  } else {
    symbolValue = symbolResult.value;
  }

  return symbolValue;
}

export function fetchTokenName(tokenAddress: Address): string {
  // hard coded overrides
  if (
    tokenAddress.toHexString() == "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a"
  ) {
    return "DGD";
  }
  if (
    tokenAddress.toHexString() == "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"
  ) {
    return "Aave Token";
  }

  let contract = ERC20.bind(tokenAddress);
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress);

  // try types string and bytes32 for name
  let nameValue = "unknown";
  let nameResult = contract.try_name();
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name();
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString();
      }
    }
  } else {
    nameValue = nameResult.value;
  }

  return nameValue;
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress);
  let totalSupplyValue = contract.totalSupply();

  log.info("tokenAddress: {}, totalsupplyValue: {}", [
    tokenAddress.toHexString(),
    totalSupplyValue.toString()
  ]);
  return totalSupplyValue as BigInt;
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  // hardcode overrides
  if (
    tokenAddress.toHexString() == "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"
  ) {
    return BigInt.fromI32(18);
  }

  let contract = ERC20.bind(tokenAddress);
  // try types uint8 for decimals
  let decimalValue = null;
  let decimalResult = contract.try_decimals();
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value;
  }
  return BigInt.fromI32(decimalValue as i32);
}

export function generateNewToken(tokenAddress: Address): Token | null {
  let token: Token = new Token(tokenAddress.toHexString());

  token.symbol = fetchTokenSymbol(tokenAddress);
  token.name = fetchTokenName(tokenAddress);
  token.totalSupply = fetchTokenTotalSupply(tokenAddress);
  let decimals = fetchTokenDecimals(tokenAddress);
  // bail if we couldn't figure out the decimals
  if (decimals === null) {
    log.debug("mybug the decimal on token 0 was null", []);
    return null;
  }

  token.decimals = decimals;
  token.tradeVolume = ZERO_BD;
  token.tradeVolumeUSD = ZERO_BD;

  token.mintVolume = ZERO_BD;
  token.mintVolumeUSD = ZERO_BD;

  token.redeemVolume = ZERO_BD;
  token.redeemVolumeUSD = ZERO_BD;
  // token.allPairs = []
  token.txCount = ZERO_BI;
  token.totalLiquidity = ZERO_BD;

  token.save();

  return token;
}

export function loadToken(tokenAddress: Address): Token | null {
  let token = Token.load(tokenAddress.toHexString());
  if (!token) {
    return generateNewToken(tokenAddress);
  }
  return token;
}

/**
 * @dev Loads user, if user doesn't exist automatically create
 * @param address EOA address
 * @returns User Object
 */
export function loadUser(address: Address): User {
  let user = User.load(address.toHexString());
  if (user === null) {
    user = new User(address.toHexString());
    user.usdSwapped = ZERO_BD;
    user.save();
  }

  return user as User;
}

export function createLiquidityPosition(
  exchange: Address,
  user: Address
): LiquidityPosition {
  let id = exchange
    .toHexString()
    .concat("-")
    .concat(user.toHexString());
  let liquidityPosition = LiquidityPosition.load(id);
  if (liquidityPosition === null) {
    let pair = Pair.load(exchange.toHexString());
    pair.liquidityProviderCount = pair.liquidityProviderCount.plus(ONE_BI);
    liquidityPosition = new LiquidityPosition(id);
    liquidityPosition.user = user.toHexString();
    liquidityPosition.pair = exchange.toHexString();
    liquidityPosition.liquidityTokenBalance = ZERO_BD;
    liquidityPosition.supplyOfPoolOwnedPercentage = ZERO_BD;
    liquidityPosition.save();
    pair.save();
  }
  if (liquidityPosition === null)
    log.error("LiquidityTokenBalance is null", [id]);
  return liquidityPosition as LiquidityPosition;
}

export function createLiquiditySnapshot(
  position: LiquidityPosition,
  event: TransferEvent,
  type: String,
  amount: BigDecimal
): void {
  let timestamp = event.block.timestamp.toI32();
  // let bundle = Bundle.load("1");
  let pair = Pair.load(position.pair);
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);

  // create new snapshot
  let snapshot = new LiquidityPositionSnapshot(
    position.id.concat(timestamp.toString())
  );
  snapshot.liquidityPosition = position.id;
  snapshot.timestamp = timestamp;
  snapshot.block = event.block.number.toI32();
  snapshot.user = position.user;
  snapshot.pair = position.pair;
  snapshot.token0Amount = ZERO_BD;
  snapshot.token1Amount = ZERO_BD;
  snapshot.token0PriceUSD = ZERO_BD; //token0.derivedETH.times(bundle.ethPrice);
  snapshot.token1PriceUSD = ZERO_BD; //token1.derivedETH.times(bundle.ethPrice);
  snapshot.reserve0 = pair.reserve0;
  snapshot.reserve1 = pair.reserve1;
  snapshot.reserveUSD = pair.reserveUSD;
  snapshot.liquidityTokenTotalSupply = pair.totalSupply;
  snapshot.liquidityTokenBalance = position.liquidityTokenBalance;
  snapshot.liquidityTokenMoved = amount;
  log.debug(
    "position.liquidityTokenBalance: {}, pair.totalSupply: {}, pair.id: {}",
    [
      position.liquidityTokenBalance.toString(),
      pair.totalSupply.toString(),
      pair.id
    ]
  );
  position.supplyOfPoolOwnedPercentage = position.liquidityTokenBalance
    .div(pair.totalSupply)
    .times(BigDecimal.fromString("100"));

  snapshot.liquidityPosition = position.id;
  snapshot.type = type.toString();
  snapshot.save();
  position.save();
}

export function calcLpPrice(
  marketAddress: Address,
  baseTokenAddress: string,
  baseTokenAmount: BigInt,
  lpAmount: BigDecimal,
  isJoin: boolean
): BigDecimal {
  let marketContract = PendleMarketContract.bind(marketAddress);
  let baseToken = Token.load(baseTokenAddress);
  let reserves = marketContract.getReserves();
  let tokenBalance = reserves.value2;
  let tokenWeight = reserves.value3;

  let totalLpSupply = marketContract.totalSupply().toBigDecimal();

  if (isJoin) {
    totalLpSupply = totalLpSupply.plus(lpAmount);
    tokenBalance = tokenBalance.plus(baseTokenAmount);
  } else {
    totalLpSupply = totalLpSupply.minus(lpAmount);
    tokenBalance = tokenBalance.minus(baseTokenAmount);
  }

  //@TODO Fetch proper base token price
  let priceOfBaseToken = getUniswapTokenPrice(baseToken as Token);
  let totalValueOfBaseToken = priceOfBaseToken
    .times(tokenBalance.toBigDecimal())
    .div(exponentToBigDecimal(baseToken.decimals));
  let baseTokenWeight = tokenWeight.toBigDecimal().div(RONE.toBigDecimal());
  let lpPrice = totalValueOfBaseToken.div(baseTokenWeight).div(totalLpSupply);
  return lpPrice;
}

export function calcMarketWorthUSD(market: Pair): BigDecimal {
  let baseToken = Token.load(market.token1);
  let baseTokenWeight = market.token1WeightRaw.toBigDecimal().div(RONE_BD);
  let baseTokenBalance = market.reserve1;
  let baseTokenPrice = getUniswapTokenPrice(baseToken as Token);
  let marketWorthUSD = baseTokenBalance
    .times(baseTokenPrice)
    .div(baseTokenWeight);
  return marketWorthUSD;
}

export function calcYieldTokenPrice(market: Pair): BigDecimal {
  // Load 2 tokens
  let baseToken = Token.load(market.token1);
  // Token weights
  let baseTokenWeight = market.token1WeightRaw.toBigDecimal().div(RONE_BD);
  let yieldTokenWeight = ONE_BD.minus(baseTokenWeight);
  // Token balances
  let baseTokenBalance = market.reserve1;
  let yieldTokenBalance = market.reserve0;
  // Finalize answer
  let marketWorth = baseTokenBalance.times(getUniswapTokenPrice(baseToken as Token)).div(baseTokenWeight);
  let yieldTokenPrice = marketWorth
    .times(yieldTokenWeight)
    .div(yieldTokenBalance);
  return yieldTokenPrice;
}

export function getBalanceOf(
  tokenAddress: Address,
  ofAddress: Address
): BigDecimal {
  let token = loadToken(tokenAddress);
  let tokenContract = ERC20.bind(tokenAddress);
  return convertTokenToDecimal(
    tokenContract.balanceOf(ofAddress),
    token.decimals
  );
}

export function printDebug(message: string, type: string): void {
  let id = "";
  let root = DebugLog.load("0");
  if (root == null) {
    id = "0";
  } else {
    root.length = root.length.plus(ONE_BI);
    root.save();
    id = root.length.toString();
  }

  let debugInstance = new DebugLog(id);
  debugInstance.message = message;
  debugInstance.type = type;
  debugInstance.length = ZERO_BI;
  debugInstance.save();

  log.debug("{} | {}", [type, message]);
}

export function loadPendleData(): PendleData {
  let pendleData = PendleData.load("1");
  if (pendleData === null) {
    pendleData = new PendleData("1");
    pendleData.protocolSwapFee = ZERO_BD;
    pendleData.swapFee = ZERO_BD;
    pendleData.exitFee = ZERO_BD;
  }

  pendleData.save();
  return pendleData as PendleData;
}

export function isMarketLiquidityMiningV2(marketAddress: Address): boolean {
  let lm = LiquidityMining.load(marketAddress.toHexString());
  if (lm == null) return false;
  return true;
}

export function quickPowBD(x: BigDecimal, y: number): BigDecimal {
  let ans = ONE_BD;
  while (y > 0) {
    if (y % 2 == 1) ans = ans.times(x);
    x = x.times(x);
    x = x.truncate(-100);
    ans = ans.truncate(-100);
    y = y / 2;
  }
  return ans;
}

export function getLpPrice(market: Pair): BigDecimal {
  return market.reserveUSD.div(market.totalSupply);
}

export function getSushiLpPrice(lpAddress: Address): BigDecimal {
  let sushiContract = SushiswapPair.bind(lpAddress);
  let totalSupply = convertTokenToDecimal(
    sushiContract.totalSupply(),
    loadToken(lpAddress).decimals
  );
  let token = loadToken(sushiContract.token0());
  let tokenPrice = getUniswapTokenPrice(token as Token);
  let tokenBalance = convertTokenToDecimal(
    sushiContract.getReserves().value0,
    token.decimals
  );
  return tokenBalance
    .times(tokenPrice)
    .times(TWO_BD)
    .div(totalSupply);
}
