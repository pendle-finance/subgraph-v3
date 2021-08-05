import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Pair, Token } from "../../generated/schema";
import {
  PendleMarket as PendleMarketContract,
  Sync as SyncEvent
} from "../../generated/templates/PendleMarket/PendleMarket";
import { ONE_BD, RONE, ZERO_BD } from "../utils/consts";
import { calcMarketWorthUSD, convertTokenToDecimal, updateMarketLiquidityMiningApr } from "../utils/helpers";

export function handleSync(event: SyncEvent): void {
  let pair = Pair.load(event.address.toHex());
  let token0 = Token.load(pair.token0); // xyt
  let token1 = Token.load(pair.token1); // baseToken
  let marketContract = PendleMarketContract.bind(
    Address.fromHexString(pair.id) as Address
  );

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  pair.totalSupply = marketContract.totalSupply().toBigDecimal();
  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);
  /* Fetches spot price*/

  let xytBalance = event.params.reserve0.toBigDecimal();
  let xytWeight_BI = event.params.weight0;
  let tokenBalance = event.params.reserve1.toBigDecimal();
  let tokenWeight_BI = RONE.minus(xytWeight_BI);

  pair.token0WeightRaw = xytWeight_BI;
  pair.token1WeightRaw = tokenWeight_BI;

  let xytWeight_BD = xytWeight_BI.toBigDecimal();
  let tokenWeight_BD = tokenWeight_BI.toBigDecimal();

  let xytDecimal = token0.decimals;
  let baseDecimal = token1.decimals;

  if (pair.reserve0.notEqual(ZERO_BD) && pair.reserve1.notEqual(ZERO_BD)) {
    let rawXytPrice = tokenBalance
      .times(xytWeight_BD)
      .div(tokenWeight_BD.times(xytBalance));

    let multipledBy = BigInt.fromI32(10).pow(
      xytDecimal.minus(baseDecimal).toI32() as u8
    );

    pair.token0Price = rawXytPrice.times(multipledBy.toBigDecimal());
    pair.token1Price = ONE_BD;
  } else {
    pair.token0Price = ZERO_BD;
    pair.token1Price = ZERO_BD;
  }

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  // save entities

  pair.reserveUSD = calcMarketWorthUSD(pair as Pair);
  pair.save();
  updateMarketLiquidityMiningApr(event.address, event.block.timestamp);
  // pair.save();

  token0.save();
  token1.save();
}
