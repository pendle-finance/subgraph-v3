import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { LiquidityMining, Token } from "../../generated/schema";
import {
  RedeemLpInterests as RedeemLpInterestsEvent,
  Staked as StakeEvent,
  Withdrawn as WithdrawEvent,
  PendleLiquidityMiningV1 as LMv1Contract,
  PendleRewardsSettled,
} from "../../generated/templates/PendleLiquidityMiningV1/PendleLiquidityMiningV1";
import { PendleLpHolder } from "../../generated/templates/PendleLiquidityMiningV1/PendleLpHolder";
import { getTokenPrice } from "../pricing";
import { PENDLE_TOKEN_ADDRESS } from "../utils/consts";
import { YTLiquidityMining } from "../utils/consts-modes/avalanche_consts";
import { convertTokenToDecimal, printDebug } from "../utils/helpers";
import {
  loadLiquidityMiningV1,
  loadToken,
  loadUserMarketData,
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

export function handleRedeemLpInterests(event: RedeemLpInterestsEvent): void {
  printDebug(
    "lm address: " +
      event.address.toHexString() +
      " expiry: " +
      event.params.expiry.toString() +
      " market: " +
      getExpiryMarket(event.address, event.params.expiry).toHexString() +
      " interests: " +
      event.params.interests.toString(),
    "handleRedeemLpInterests"
  );
  redeemLpInterests(
    event.params.user,
    getExpiryMarket(event.address, event.params.expiry),
    event.params.interests
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

  // avalanche qiUSDC / USDC
  // if (str == "0x574d9626f0bfde8b48cb762154dabf052812ccc6") {
  //   lmAddress = "0x072b28b1b3b7f5f34af8b32c6fd74b64a92e4c3d";
  // }

  // // avalanche JLP(AVAXUSDC) / USDC
  // if (str == "0x414e36e93d055f1912d05fbd446e9c70899293fb") {
  //   lmAddress = "0x10688f2bb9ff5881d88c41aafc1c28b630339a1c";
  // }

  // // avalanche JLP(PA) / PENDLE
  // if (str == "0x027dfe08d7a3ce2562ce17a6f6f4b78d26f360bd") {
  //   lmAddress = "0xa90db3286122355309cd161c3aec2ddb28021b6a";
  // }

  // // avalanche xJOE / USDC
  // if (str == "0xcf5f662b388302836c1c2899446e2267b081c690") {
  //   lmAddress = "0xc623caf18efab2c47f419e9529dedf0bdbcd560c";
  // }

  for (let i = 0; i < YTLiquidityMining.length; ++i) {
    if (str == YTLiquidityMining[i][0]) {
      lmAddress = YTLiquidityMining[i][1];
    }
  }

  if (str == "0x7552f903e33db53a86167c1e74f0e082bd0740d5") {
    lmAddress = "0x2489a32844556193fb296c22597bdc158e9762a0";
  }

  if (str == "0x80aae49b1142e2f135033829a1b647b1636c1506") {
    lmAddress = "0x47a3e9d5c87651d4074ef67a160afdb3f42cb242";
  }

  if (str == "0xd5736ba0be93c99a10e2264e8e4ebd54633306f8") {
    lmAddress = "0x204e698a71bb1973823517c74be041a985eaa46e";
  }

  if (str == "0x3e2737eb1b513bcee93a2144204d22695b272215") {
    lmAddress = "0xa3e0ca7e35f47f6547c0c2d8f005312c2188e70f";
  }

  if (lmAddress.length > 0) {
    return loadLiquidityMiningV1(Address.fromHexString(lmAddress) as Address);
  }
  return null;
}
