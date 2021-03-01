import {
  log,
  BigInt,
  BigDecimal,
  Address,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  ERC20,
  Transfer as TransferEvent,
} from "../generated/templates/PendleMarket/ERC20";
import { ERC20SymbolBytes } from "../generated/templates/IPendleForge/ERC20SymbolBytes";
import { ERC20NameBytes } from "../generated/templates/IPendleForge/ERC20NameBytes";
import {
  Token,
  User,
  LiquidityPosition,
  LiquidityPositionSnapshot,
  Pair,
} from "../generated/schema";

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let ZERO_BD = BigDecimal.fromString("0");
export let ONE_BD = BigDecimal.fromString("1");
export let BI_18 = BigInt.fromI32(18);
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

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
    totalSupplyValue.toString(),
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
      pair.id,
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
