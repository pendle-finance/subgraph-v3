import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  SwapEvent,
  Join as JoinLiquidityPoolEvent,
  Exit as ExitLiquidityPoolEvent,
  MarketCreated as MarketCreatedEvent
} from "../../generated/PendleRouter/PendleRouter";
import { LiquidityPool, Pair, Swap, Token, LpHolder } from "../../generated/schema";
import { PendleMarket as PendleMarketTemplate, ERC20 as ERC20Template } from "../../generated/templates";
import { PendleMarket as PendleMarketContract } from "../../generated/templates/PendleMarket/PendleMarket";
import { getUniswapTokenPrice } from "../uniswap/pricing";
import { updatePairDailyData, updatePairHourData } from "../updates";
import {
  ERROR_COMPOUND_MARKET,
  ONE_BD,
  ONE_BI,
  RONE,
  RONE_BD,
  ZERO_BD,
  ZERO_BI
} from "../utils/consts";
import {
  calcLpPrice,
  convertTokenToDecimal,
  generateNewToken,
  loadPendleData,
  printDebug
} from "../utils/helpers";
import { getLiquidityMining } from "./liquidity-mining-v1";

export function handleMarketCreated(event: MarketCreatedEvent): void {
  // skip error market
  if (event.params.market.toHexString() == ERROR_COMPOUND_MARKET) {
    return;
  }
  // create the tokens
  let token0 = Token.load(event.params.xyt.toHexString());
  let token1 = Token.load(event.params.token.toHexString());
  //Generating LP Token
  generateNewToken(event.params.market);

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

  token0.type = "yt";
  token1.type = "swapBase";

  let pair = new Pair(event.params.market.toHexString());

  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.token0WeightRaw = ZERO_BI;
  pair.token1WeightRaw = ZERO_BI;
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
  pair.lpStaked = ZERO_BD;
  pair.lpPriceUSD = ZERO_BD;
  pair.lpStakedUSD = ZERO_BD;

  let lm = getLiquidityMining(event.params.market);

  if (lm != null) pair.liquidityMining = lm.id;

  // create the tracked contract based on the template
  PendleMarketTemplate.create(event.params.market);
  // get market expiry
  let market = PendleMarketContract.bind(
    Address.fromHexString(pair.id) as Address
  );
  pair.expiry = market.expiry();

  // save updated values
  token0.save();
  token1.save();
  pair.save();

  let lpHolder = new LpHolder(pair.id);
  lpHolder.market = pair.id;
  lpHolder.save();
}

/*
{
  debugLogs(first:10){
    message
  }
}
*/
