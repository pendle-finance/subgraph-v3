import {
  NewMarketFactory as NewMarketFactoryEvent,
  ForgeAdded as NewForgeEvent,
  MarketFeesSet as MarketFeesSetEvent
} from "../../generated/PendleData/PendleData";
import { Forge, MarketFactory } from "../../generated/schema";
import { IPendleForge as PendleForgeTemplate } from "../../generated/templates";
import { initializeQuickSwapPools } from "../quickswap/factory";
import { initializeUniswapPools } from "../uniswap/factory";
import { RONE } from "../utils/consts";
import { loadPendleData } from "../utils/helpers";

/** PENDLE DATA EVENTS */
export function handleMarketFeesSet(event: MarketFeesSetEvent): void {
  let pendleData = loadPendleData();

  pendleData.swapFee = event.params._swapFee
    .toBigDecimal()
    .div(RONE.toBigDecimal());
  pendleData.protocolSwapFee = event.params._swapFee
    .toBigDecimal()
    .div(RONE.toBigDecimal());

  pendleData.save();
}

/** PENDLE ROUTER EVENTS */
export function handleNewForge(event: NewForgeEvent): void {
  // This line is put here on the purpose that its just gonna run once at the start of Pendle subgraph
  initializeUniswapPools();
  initializeQuickSwapPools();
  let forge = new Forge(event.params.forgeAddress.toHexString());
  forge.forgeId = event.params.forgeId.toString();
  forge.save();
  PendleForgeTemplate.create(event.params.forgeAddress);
}

export function handleNewMarketFactory(event: NewMarketFactoryEvent): void {
  let newMarketFactory = new MarketFactory(
    event.params.marketFactoryId.toString()
  );
  newMarketFactory.address = event.params.marketFactoryAddress.toHexString();
  newMarketFactory.save();
}
