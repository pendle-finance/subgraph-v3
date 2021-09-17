import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { LiquidityMining, Token } from "../../generated/schema";
import {
  RedeemLpInterestsCall,
  Staked as StakeEvent,
  Withdrawn as WithdrawEvent,
  PendleLiquidityMiningV1 as LMv1Contract,
  PendleRewardsSettled
} from "../../generated/templates/PendleLiquidityMiningV1/PendleLiquidityMiningV1";
import { PendleLpHolder } from "../../generated/templates/PendleLiquidityMiningV1/PendleLpHolder";
import { getTokenPrice } from "../pricing";
import { PENDLE_TOKEN_ADDRESS } from "../utils/consts";
import { convertTokenToDecimal, printDebug } from "../utils/helpers";
import {
  loadLiquidityMiningV1,
  loadToken,
  loadUserMarketData
} from "../utils/load-entity";
import { redeemLpInterests } from "./market";

export function handleStake(event: StakeEvent): void {}

export function handleWithdrawn(event: WithdrawEvent): void {}

export function handleRedeemReward(event: PendleRewardsSettled): void {
  let rel = loadUserMarketData(
    event.params.user,
    getExpiryMarket(event.address, event.params.expiry)
  );
  let pendleToken = loadToken(PENDLE_TOKEN_ADDRESS as Address);
  let amount = convertTokenToDecimal(event.params.amount, pendleToken.decimals);
  rel.pendleRewardReceivedRaw = rel.pendleRewardReceivedRaw.plus(amount);
  rel.pendleRewardReceivedUSD = rel.pendleRewardReceivedRaw.times(
    getTokenPrice(pendleToken as Token)
  );
  rel.save();
  return;
}

export function handleRedeemLpInterests(call: RedeemLpInterestsCall): void {
  redeemLpInterests(
    call.inputs.user,
    getExpiryMarket(call.to, call.inputs.expiry),
    call.outputs.interests
  );
}

function getExpiryMarket(liquidityMining: Address, expiry: BigInt): Address {
  let contract = LMv1Contract.bind(liquidityMining);
  let lpHolder = contract.readExpiryData(expiry).value3;
  let lpHolderContract = PendleLpHolder.bind(lpHolder);
  let marketAddress = lpHolderContract.pendleMarket();
  return marketAddress;
}

export function getMarketLiquidityMining(
  marketAddress: Address
): LiquidityMining {
  // Try v2?
  let lm = LiquidityMining.load(marketAddress.toHexString());
  if (lm == null) {
    return hardcodedLiquidityMining(marketAddress);
  }
  return lm as LiquidityMining;
}

export function hardcodedLiquidityMining(
  marketAddress: Address
): LiquidityMining {
  let str = marketAddress.toHexString();
  let lmAddress = "";

  // kovan eth-usdc slp - usdc
  if (str == "0x68fc791abd6339c064146ddc9506774aa142efbe") {
    lmAddress = "0x63faa1e8faebafa0209e8a9fb4c418828485de85";
  }

  // mainnet eth-usdc slp - usdc
  if (str == "0x79c05da47dc20ff9376b2f7dbf8ae0c994c3a0d0") {
    lmAddress = "0xa78029ab5235b9a83ec45ed036042db26c6e4300";
  }

  // mainnet pendle-eth slp
  if (str == "0x685d32f394a5f03e78a1a0f6a91b4e2bf6f52cfe") {
    lmAddress = "0x0f3bccbfef1dc227f33a11d7a51cd02dead208c8";
  }

  // kovan pendle-eth slp
  if (str == "0x4835f1f01102ea3c033ae193ec6ec63961863335") {
    lmAddress = "0x5fdbb48fced67425ab0598544de1aa63c220ea9d";
  }

  // mainnet cdai
  if (
    str == "0xb26c86330fc7f97533051f2f8cd0a90c2e82b5ee" ||
    str == "0x944d1727d0b656f497e74044ff589871c330334f"
  ) {
    lmAddress = "0x5b1c59eb6872f88a92469751a034b9b5ada9a73f";
  }

  // mainnet ausdc
  if (
    str == "0x8315bcbc2c5c1ef09b71731ab3827b0808a2d6bd" ||
    str == "0x9e382e5f78b06631e4109b5d48151f2b3f326df0"
  ) {
    lmAddress = "0x6f40a68e99645c60f14b497e75ae024777d61726";
  }

  // kovan cdai
  if (
    str == "0x16d7dd5673ed2f1adaaa0feabba2271585e498cc" ||
    str == "0xba83823e364646d0d60ecfc9b2b31311abf66688"
  ) {
    lmAddress = "0x25fc31df947eb3d92cfbdbbc38ebcf8519be49bc";
  }

  // kovan ausdc
  if (
    str == "0xbcd2962e406a3265a90d4ed54880cc089bc8ec1f" ||
    str == "0x2c49cf6bba5b6263d15c2afe79d98fa8a0386ec2"
  ) {
    lmAddress = "0x4a7e31f01119c921fda702e54a882a289cf7c637";
  }

  if (lmAddress.length > 0) {
    return loadLiquidityMiningV1(Address.fromHexString(lmAddress) as Address);
  }
  return null;
}
