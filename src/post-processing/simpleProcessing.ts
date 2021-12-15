import BigNumber from "bignumber.js";
import { propertiesName } from "../utils/consts";

function forges(data: any): any {
  return data;
}

function marketFactorys(data: any): any {
  return data;
}

function yieldContracts(data: any): any {
  if (propertiesName.expiry in data) {
    data[propertiesName.expiry] = new BigNumber(data[propertiesName.expiry]);
  }
  if (propertiesName.mintTxCount in data) {
    data[propertiesName.mintTxCount] = new BigNumber(
      data[propertiesName.mintTxCount]
    );
  }
  if (propertiesName.redeemTxCount in data) {
    data[propertiesName.redeemTxCount] = new BigNumber(
      data[propertiesName.redeemTxCount]
    );
  }
  if (propertiesName.interestSettledTxCount in data) {
    data[propertiesName.interestSettledTxCount] = new BigNumber(
      data[propertiesName.interestSettledTxCount]
    );
  }
  if (propertiesName.lockedVolume in data) {
    data[propertiesName.lockedVolume] = new BigNumber(
      data[propertiesName.lockedVolume]
    );
  }
  if (propertiesName.mintVolume in data) {
    data[propertiesName.mintVolume] = new BigNumber(
      data[propertiesName.mintVolume]
    );
  }
  if (propertiesName.redeemVolume in data) {
    data[propertiesName.redeemVolume] = new BigNumber(
      data[propertiesName.redeemVolume]
    );
  }
  if (propertiesName.lockedVolumeUSD in data) {
    data[propertiesName.lockedVolumeUSD] = new BigNumber(
      data[propertiesName.lockedVolumeUSD]
    );
  }
  if (propertiesName.mintVolumeUSD in data) {
    data[propertiesName.mintVolumeUSD] = new BigNumber(
      data[propertiesName.mintVolumeUSD]
    );
  }
  if (propertiesName.redeemVolumeUSD in data) {
    data[propertiesName.redeemVolumeUSD] = new BigNumber(
      data[propertiesName.redeemVolumeUSD]
    );
  }
  if (propertiesName.interestSettledVolume in data) {
    data[propertiesName.interestSettledVolume] = new BigNumber(
      data[propertiesName.interestSettledVolume]
    );
  }
  return data;
}

function tokens(data: any): any {
  if (propertiesName.decimals in data) {
    data[propertiesName.decimals] = new BigNumber(
      data[propertiesName.decimals]
    );
  }
  if (propertiesName.totalSupply in data) {
    data[propertiesName.totalSupply] = new BigNumber(
      data[propertiesName.totalSupply]
    );
  }
  if (propertiesName.tradeVolume in data) {
    data[propertiesName.tradeVolume] = new BigNumber(
      data[propertiesName.tradeVolume]
    );
  }
  if (propertiesName.tradeVolumeUSD in data) {
    data[propertiesName.tradeVolumeUSD] = new BigNumber(
      data[propertiesName.tradeVolumeUSD]
    );
  }
  if (propertiesName.mintVolume in data) {
    data[propertiesName.mintVolume] = new BigNumber(
      data[propertiesName.mintVolume]
    );
  }
  if (propertiesName.mintVolumeUSD in data) {
    data[propertiesName.mintVolumeUSD] = new BigNumber(
      data[propertiesName.mintVolumeUSD]
    );
  }
  if (propertiesName.redeemVolume in data) {
    data[propertiesName.redeemVolume] = new BigNumber(
      data[propertiesName.redeemVolume]
    );
  }
  if (propertiesName.redeemVolumeUSD in data) {
    data[propertiesName.redeemVolumeUSD] = new BigNumber(
      data[propertiesName.redeemVolumeUSD]
    );
  }
  if (propertiesName.txCount in data) {
    data[propertiesName.txCount] = new BigNumber(data[propertiesName.txCount]);
  }
  if (propertiesName.totalLiquidity in data) {
    data[propertiesName.totalLiquidity] = new BigNumber(
      data[propertiesName.totalLiquidity]
    );
  }
  return data;
}

function mintYieldTokens(data: any): any {
  if (propertiesName.blockNumber in data) {
    data[propertiesName.blockNumber] = new BigNumber(
      data[propertiesName.blockNumber]
    );
  }
  if (propertiesName.timestamp in data) {
    data[propertiesName.timestamp] = new BigNumber(
      data[propertiesName.timestamp]
    );
  }
  if (propertiesName.amountToTokenize in data) {
    data[propertiesName.amountToTokenize] = new BigNumber(
      data[propertiesName.amountToTokenize]
    );
  }
  if (propertiesName.amountMinted in data) {
    data[propertiesName.amountMinted] = new BigNumber(
      data[propertiesName.amountMinted]
    );
  }
  if (propertiesName.expiry in data) {
    data[propertiesName.expiry] = new BigNumber(data[propertiesName.expiry]);
  }
  if (propertiesName.mintedValueUSD in data) {
    data[propertiesName.mintedValueUSD] = new BigNumber(
      data[propertiesName.mintedValueUSD]
    );
  }
  return data;
}

function redeemYieldTokens(data: any): any {
  if (propertiesName.blockNumber in data) {
    data[propertiesName.blockNumber] = new BigNumber(
      data[propertiesName.blockNumber]
    );
  }
  if (propertiesName.timestamp in data) {
    data[propertiesName.timestamp] = new BigNumber(
      data[propertiesName.timestamp]
    );
  }
  if (propertiesName.amountToRedeem in data) {
    data[propertiesName.amountToRedeem] = new BigNumber(
      data[propertiesName.amountToRedeem]
    );
  }
  if (propertiesName.amountRedeemed in data) {
    data[propertiesName.amountRedeemed] = new BigNumber(
      data[propertiesName.amountRedeemed]
    );
  }
  if (propertiesName.expiry in data) {
    data[propertiesName.expiry] = new BigNumber(data[propertiesName.expiry]);
  }
  if (propertiesName.redeemedValueUSD in data) {
    data[propertiesName.redeemedValueUSD] = new BigNumber(
      data[propertiesName.redeemedValueUSD]
    );
  }
  return data;
}

function pairs(data: any): any {
  if (propertiesName.reserve0 in data) {
    data[propertiesName.reserve0] = new BigNumber(
      data[propertiesName.reserve0]
    );
  }
  if (propertiesName.reserve1 in data) {
    data[propertiesName.reserve1] = new BigNumber(
      data[propertiesName.reserve1]
    );
  }
  if (propertiesName.totalSupply in data) {
    data[propertiesName.totalSupply] = new BigNumber(
      data[propertiesName.totalSupply]
    );
  }
  if (propertiesName.token0WeightRaw in data) {
    data[propertiesName.token0WeightRaw] = new BigNumber(
      data[propertiesName.token0WeightRaw]
    );
  }
  if (propertiesName.token1WeightRaw in data) {
    data[propertiesName.token1WeightRaw] = new BigNumber(
      data[propertiesName.token1WeightRaw]
    );
  }
  if (propertiesName.reserveUSD in data) {
    data[propertiesName.reserveUSD] = new BigNumber(
      data[propertiesName.reserveUSD]
    );
  }
  if (propertiesName.token0Price in data) {
    data[propertiesName.token0Price] = new BigNumber(
      data[propertiesName.token0Price]
    );
  }
  if (propertiesName.token1Price in data) {
    data[propertiesName.token1Price] = new BigNumber(
      data[propertiesName.token1Price]
    );
  }
  if (propertiesName.volumeToken0 in data) {
    data[propertiesName.volumeToken0] = new BigNumber(
      data[propertiesName.volumeToken0]
    );
  }
  if (propertiesName.volumeToken1 in data) {
    data[propertiesName.volumeToken1] = new BigNumber(
      data[propertiesName.volumeToken1]
    );
  }
  if (propertiesName.volumeUSD in data) {
    data[propertiesName.volumeUSD] = new BigNumber(
      data[propertiesName.volumeUSD]
    );
  }
  if (propertiesName.txCount in data) {
    data[propertiesName.txCount] = new BigNumber(data[propertiesName.txCount]);
  }
  if (propertiesName.feesToken0 in data) {
    data[propertiesName.feesToken0] = new BigNumber(
      data[propertiesName.feesToken0]
    );
  }
  if (propertiesName.feesToken1 in data) {
    data[propertiesName.feesToken1] = new BigNumber(
      data[propertiesName.feesToken1]
    );
  }
  if (propertiesName.feesUSD in data) {
    data[propertiesName.feesUSD] = new BigNumber(data[propertiesName.feesUSD]);
  }
  if (propertiesName.createdAtTimestamp in data) {
    data[propertiesName.createdAtTimestamp] = new BigNumber(
      data[propertiesName.createdAtTimestamp]
    );
  }
  if (propertiesName.createdAtBlockNumber in data) {
    data[propertiesName.createdAtBlockNumber] = new BigNumber(
      data[propertiesName.createdAtBlockNumber]
    );
  }
  if (propertiesName.expiry in data) {
    data[propertiesName.expiry] = new BigNumber(data[propertiesName.expiry]);
  }
  if (propertiesName.lpPriceUSD in data) {
    data[propertiesName.lpPriceUSD] = new BigNumber(
      data[propertiesName.lpPriceUSD]
    );
  }
  if (propertiesName.lpStaked in data) {
    data[propertiesName.lpStaked] = new BigNumber(
      data[propertiesName.lpStaked]
    );
  }
  if (propertiesName.lpStakedUSD in data) {
    data[propertiesName.lpStakedUSD] = new BigNumber(
      data[propertiesName.lpStakedUSD]
    );
  }
  if (propertiesName.lpAPR in data) {
    data[propertiesName.lpAPR] = new BigNumber(data[propertiesName.lpAPR]);
  }
  return data;
}

function swaps(data: any): any {
  if (propertiesName.inAmount in data) {
    data[propertiesName.inAmount] = new BigNumber(
      data[propertiesName.inAmount]
    );
  }
  if (propertiesName.outAmount in data) {
    data[propertiesName.outAmount] = new BigNumber(
      data[propertiesName.outAmount]
    );
  }
  if (propertiesName.logIndex in data) {
    data[propertiesName.logIndex] = new BigNumber(
      data[propertiesName.logIndex]
    );
  }
  if (propertiesName.feesCollected in data) {
    data[propertiesName.feesCollected] = new BigNumber(
      data[propertiesName.feesCollected]
    );
  }
  if (propertiesName.feesCollectedUSD in data) {
    data[propertiesName.feesCollectedUSD] = new BigNumber(
      data[propertiesName.feesCollectedUSD]
    );
  }
  if (propertiesName.amountUSD in data) {
    data[propertiesName.amountUSD] = new BigNumber(
      data[propertiesName.amountUSD]
    );
  }
  return data;
}

function users(data: any): any {
  if (propertiesName.usdSwapped in data) {
    data[propertiesName.usdSwapped] = new BigNumber(
      data[propertiesName.usdSwapped]
    );
  }
  return data;
}

function liquidityMinings(data: any): any {
  return data;
}

function liquidityMiningExpirys(data: any): any {
  return data;
}

function liquidityPositions(data: any): any {
  if (propertiesName.liquidityTokenBalance in data) {
    data[propertiesName.liquidityTokenBalance] = new BigNumber(
      data[propertiesName.liquidityTokenBalance]
    );
  }
  return data;
}

function liquidityPositionSnapshots(data: any): any {
  return data;
}

function transactions(data: any): any {
  if (propertiesName.blockNumber in data) {
    data[propertiesName.blockNumber] = new BigNumber(
      data[propertiesName.blockNumber]
    );
  }
  if (propertiesName.timestamp in data) {
    data[propertiesName.timestamp] = new BigNumber(
      data[propertiesName.timestamp]
    );
  }
  return data;
}

function mintLPTokens(data: any): any {
  if (propertiesName.liquidity in data) {
    data[propertiesName.liquidity] = new BigNumber(
      data[propertiesName.liquidity]
    );
  }
  if (propertiesName.amount0 in data) {
    data[propertiesName.amount0] = new BigNumber(data[propertiesName.amount0]);
  }
  if (propertiesName.amount1 in data) {
    data[propertiesName.amount1] = new BigNumber(data[propertiesName.amount1]);
  }
  if (propertiesName.logIndex in data) {
    data[propertiesName.logIndex] = new BigNumber(
      data[propertiesName.logIndex]
    );
  }
  if (propertiesName.amountUSD in data) {
    data[propertiesName.amountUSD] = new BigNumber(
      data[propertiesName.amountUSD]
    );
  }
  if (propertiesName.feeLiquidity in data) {
    data[propertiesName.feeLiquidity] = new BigNumber(
      data[propertiesName.feeLiquidity]
    );
  }
  return data;
}

function burnLPTokens(data: any): any {
  if (propertiesName.liquidity in data) {
    data[propertiesName.liquidity] = new BigNumber(
      data[propertiesName.liquidity]
    );
  }
  if (propertiesName.amount0 in data) {
    data[propertiesName.amount0] = new BigNumber(data[propertiesName.amount0]);
  }
  if (propertiesName.amount1 in data) {
    data[propertiesName.amount1] = new BigNumber(data[propertiesName.amount1]);
  }
  if (propertiesName.logIndex in data) {
    data[propertiesName.logIndex] = new BigNumber(
      data[propertiesName.logIndex]
    );
  }
  if (propertiesName.amountUSD in data) {
    data[propertiesName.amountUSD] = new BigNumber(
      data[propertiesName.amountUSD]
    );
  }
  if (propertiesName.feeLiquidity in data) {
    data[propertiesName.feeLiquidity] = new BigNumber(
      data[propertiesName.feeLiquidity]
    );
  }
  return data;
}

function pendleDatas(data: any): any {
  if (propertiesName.protocolSwapFee in data) {
    data[propertiesName.protocolSwapFee] = new BigNumber(
      data[propertiesName.protocolSwapFee]
    );
  }
  if (propertiesName.swapFee in data) {
    data[propertiesName.swapFee] = new BigNumber(data[propertiesName.swapFee]);
  }
  if (propertiesName.exitFee in data) {
    data[propertiesName.exitFee] = new BigNumber(data[propertiesName.exitFee]);
  }
  return data;
}

function liquidityPools(data: any): any {
  if (propertiesName.inAmount0 in data) {
    data[propertiesName.inAmount0] = new BigNumber(
      data[propertiesName.inAmount0]
    );
  }
  if (propertiesName.inAmount1 in data) {
    data[propertiesName.inAmount1] = new BigNumber(
      data[propertiesName.inAmount1]
    );
  }
  if (propertiesName.feesCollected in data) {
    data[propertiesName.feesCollected] = new BigNumber(
      data[propertiesName.feesCollected]
    );
  }
  if (propertiesName.swapFeesCollectedUSD in data) {
    data[propertiesName.swapFeesCollectedUSD] = new BigNumber(
      data[propertiesName.swapFeesCollectedUSD]
    );
  }
  if (propertiesName.swapVolumeUSD in data) {
    data[propertiesName.swapVolumeUSD] = new BigNumber(
      data[propertiesName.swapVolumeUSD]
    );
  }
  if (propertiesName.lpAmount in data) {
    data[propertiesName.lpAmount] = new BigNumber(
      data[propertiesName.lpAmount]
    );
  }
  if (propertiesName.amountUSD in data) {
    data[propertiesName.amountUSD] = new BigNumber(
      data[propertiesName.amountUSD]
    );
  }
  return data;
}

function pairHourDatas(data: any): any {
  if (propertiesName.totalSupply in data) {
    data[propertiesName.totalSupply] = new BigNumber(
      data[propertiesName.totalSupply]
    );
  }
  if (propertiesName.reserve0 in data) {
    data[propertiesName.reserve0] = new BigNumber(
      data[propertiesName.reserve0]
    );
  }
  if (propertiesName.reserve1 in data) {
    data[propertiesName.reserve1] = new BigNumber(
      data[propertiesName.reserve1]
    );
  }
  if (propertiesName.marketWorthUSD in data) {
    data[propertiesName.marketWorthUSD] = new BigNumber(
      data[propertiesName.marketWorthUSD]
    );
  }
  if (propertiesName.hourlyVolumeToken0 in data) {
    data[propertiesName.hourlyVolumeToken0] = new BigNumber(
      data[propertiesName.hourlyVolumeToken0]
    );
  }
  if (propertiesName.hourlyVolumeToken1 in data) {
    data[propertiesName.hourlyVolumeToken1] = new BigNumber(
      data[propertiesName.hourlyVolumeToken1]
    );
  }
  if (propertiesName.hourlyVolumeUSD in data) {
    data[propertiesName.hourlyVolumeUSD] = new BigNumber(
      data[propertiesName.hourlyVolumeUSD]
    );
  }
  if (propertiesName.hourlyTxns in data) {
    data[propertiesName.hourlyTxns] = new BigNumber(
      data[propertiesName.hourlyTxns]
    );
  }
  if (propertiesName.yieldTokenPrice_open in data) {
    data[propertiesName.yieldTokenPrice_open] = new BigNumber(
      data[propertiesName.yieldTokenPrice_open]
    );
  }
  if (propertiesName.yieldTokenPrice_close in data) {
    data[propertiesName.yieldTokenPrice_close] = new BigNumber(
      data[propertiesName.yieldTokenPrice_close]
    );
  }
  if (propertiesName.yieldTokenPrice_high in data) {
    data[propertiesName.yieldTokenPrice_high] = new BigNumber(
      data[propertiesName.yieldTokenPrice_high]
    );
  }
  if (propertiesName.yieldTokenPrice_low in data) {
    data[propertiesName.yieldTokenPrice_low] = new BigNumber(
      data[propertiesName.yieldTokenPrice_low]
    );
  }
  if (propertiesName.lpTokenPrice in data) {
    data[propertiesName.lpTokenPrice] = new BigNumber(
      data[propertiesName.lpTokenPrice]
    );
  }
  if (propertiesName.baseTokenPrice in data) {
    data[propertiesName.baseTokenPrice] = new BigNumber(
      data[propertiesName.baseTokenPrice]
    );
  }
  if (propertiesName.yieldBearingAssetPrice in data) {
    data[propertiesName.yieldBearingAssetPrice] = new BigNumber(
      data[propertiesName.yieldBearingAssetPrice]
    );
  }
  if (propertiesName.impliedYield in data) {
    data[propertiesName.impliedYield] = new BigNumber(
      data[propertiesName.impliedYield]
    );
  }
  return data;
}

function pairDailyDatas(data: any): any {
  if (propertiesName.totalSupply in data) {
    data[propertiesName.totalSupply] = new BigNumber(
      data[propertiesName.totalSupply]
    );
  }
  if (propertiesName.reserve0 in data) {
    data[propertiesName.reserve0] = new BigNumber(
      data[propertiesName.reserve0]
    );
  }
  if (propertiesName.reserve1 in data) {
    data[propertiesName.reserve1] = new BigNumber(
      data[propertiesName.reserve1]
    );
  }
  if (propertiesName.marketWorthUSD in data) {
    data[propertiesName.marketWorthUSD] = new BigNumber(
      data[propertiesName.marketWorthUSD]
    );
  }
  if (propertiesName.dailyVolumeToken0 in data) {
    data[propertiesName.dailyVolumeToken0] = new BigNumber(
      data[propertiesName.dailyVolumeToken0]
    );
  }
  if (propertiesName.dailyVolumeToken1 in data) {
    data[propertiesName.dailyVolumeToken1] = new BigNumber(
      data[propertiesName.dailyVolumeToken1]
    );
  }
  if (propertiesName.dailyVolumeUSD in data) {
    data[propertiesName.dailyVolumeUSD] = new BigNumber(
      data[propertiesName.dailyVolumeUSD]
    );
  }
  if (propertiesName.dailyTxns in data) {
    data[propertiesName.dailyTxns] = new BigNumber(
      data[propertiesName.dailyTxns]
    );
  }
  if (propertiesName.yieldTokenPrice_open in data) {
    data[propertiesName.yieldTokenPrice_open] = new BigNumber(
      data[propertiesName.yieldTokenPrice_open]
    );
  }
  if (propertiesName.yieldTokenPrice_close in data) {
    data[propertiesName.yieldTokenPrice_close] = new BigNumber(
      data[propertiesName.yieldTokenPrice_close]
    );
  }
  if (propertiesName.yieldTokenPrice_high in data) {
    data[propertiesName.yieldTokenPrice_high] = new BigNumber(
      data[propertiesName.yieldTokenPrice_high]
    );
  }
  if (propertiesName.yieldTokenPrice_low in data) {
    data[propertiesName.yieldTokenPrice_low] = new BigNumber(
      data[propertiesName.yieldTokenPrice_low]
    );
  }
  if (propertiesName.lpTokenPrice in data) {
    data[propertiesName.lpTokenPrice] = new BigNumber(
      data[propertiesName.lpTokenPrice]
    );
  }
  if (propertiesName.baseTokenPrice in data) {
    data[propertiesName.baseTokenPrice] = new BigNumber(
      data[propertiesName.baseTokenPrice]
    );
  }
  if (propertiesName.yieldBearingAssetPrice in data) {
    data[propertiesName.yieldBearingAssetPrice] = new BigNumber(
      data[propertiesName.yieldBearingAssetPrice]
    );
  }
  if (propertiesName.impliedYield in data) {
    data[propertiesName.impliedYield] = new BigNumber(
      data[propertiesName.impliedYield]
    );
  }
  return data;
}

function uniswapPools(data: any): any {
  return data;
}

function uniswapTokenPrices(data: any): any {
  if (propertiesName.price in data) {
    data[propertiesName.price] = new BigNumber(data[propertiesName.price]);
  }
  return data;
}

function sushiswapPairs(data: any): any {
  if (propertiesName.marketWorthUSD in data) {
    data[propertiesName.marketWorthUSD] = new BigNumber(
      data[propertiesName.marketWorthUSD]
    );
  }
  if (propertiesName.baseTokenBalance in data) {
    data[propertiesName.baseTokenBalance] = new BigNumber(
      data[propertiesName.baseTokenBalance]
    );
  }
  if (propertiesName.baseTokenPrice in data) {
    data[propertiesName.baseTokenPrice] = new BigNumber(
      data[propertiesName.baseTokenPrice]
    );
  }
  if (propertiesName.otBalance in data) {
    data[propertiesName.otBalance] = new BigNumber(
      data[propertiesName.otBalance]
    );
  }
  if (propertiesName.otPrice in data) {
    data[propertiesName.otPrice] = new BigNumber(data[propertiesName.otPrice]);
  }
  if (propertiesName.totalTradingUSD in data) {
    data[propertiesName.totalTradingUSD] = new BigNumber(
      data[propertiesName.totalTradingUSD]
    );
  }
  if (propertiesName.totalStaked in data) {
    data[propertiesName.totalStaked] = new BigNumber(
      data[propertiesName.totalStaked]
    );
  }
  if (propertiesName.totalReward in data) {
    data[propertiesName.totalReward] = new BigNumber(
      data[propertiesName.totalReward]
    );
  }
  if (propertiesName.lpPrice in data) {
    data[propertiesName.lpPrice] = new BigNumber(data[propertiesName.lpPrice]);
  }
  if (propertiesName.aprPercentage in data) {
    data[propertiesName.aprPercentage] = new BigNumber(
      data[propertiesName.aprPercentage]
    );
  }
  if (propertiesName.updatedAt in data) {
    data[propertiesName.updatedAt] = new BigNumber(
      data[propertiesName.updatedAt]
    );
  }
  return data;
}

function sushiswapPairHourDatas(data: any): any {
  if (propertiesName.tradingVolumeUSD in data) {
    data[propertiesName.tradingVolumeUSD] = new BigNumber(
      data[propertiesName.tradingVolumeUSD]
    );
  }
  return data;
}

function userMarketDatas(data: any): any {
  if (propertiesName.lpHolding in data) {
    data[propertiesName.lpHolding] = new BigNumber(
      data[propertiesName.lpHolding]
    );
  }
  if (propertiesName.recordedUSDValue in data) {
    data[propertiesName.recordedUSDValue] = new BigNumber(
      data[propertiesName.recordedUSDValue]
    );
  }
  if (propertiesName.capitalProvided in data) {
    data[propertiesName.capitalProvided] = new BigNumber(
      data[propertiesName.capitalProvided]
    );
  }
  if (propertiesName.capitalWithdrawn in data) {
    data[propertiesName.capitalWithdrawn] = new BigNumber(
      data[propertiesName.capitalWithdrawn]
    );
  }
  if (propertiesName.yieldClaimedUsd in data) {
    data[propertiesName.yieldClaimedUsd] = new BigNumber(
      data[propertiesName.yieldClaimedUsd]
    );
  }
  if (propertiesName.yieldClaimedRaw in data) {
    data[propertiesName.yieldClaimedRaw] = new BigNumber(
      data[propertiesName.yieldClaimedRaw]
    );
  }
  if (propertiesName.pendleRewardReceivedRaw in data) {
    data[propertiesName.pendleRewardReceivedRaw] = new BigNumber(
      data[propertiesName.pendleRewardReceivedRaw]
    );
  }
  if (propertiesName.pendleRewardReceivedUSD in data) {
    data[propertiesName.pendleRewardReceivedUSD] = new BigNumber(
      data[propertiesName.pendleRewardReceivedUSD]
    );
  }
  return data;
}

function lpTransferEvents(data: any): any {
  if (propertiesName.lpPrice in data) {
    data[propertiesName.lpPrice] = new BigNumber(data[propertiesName.lpPrice]);
  }
  if (propertiesName.amount in data) {
    data[propertiesName.amount] = new BigNumber(data[propertiesName.amount]);
  }
  if (propertiesName.timestamp in data) {
    data[propertiesName.timestamp] = new BigNumber(
      data[propertiesName.timestamp]
    );
  }
  if (propertiesName.block in data) {
    data[propertiesName.block] = new BigNumber(data[propertiesName.block]);
  }
  return data;
}

function debugLogs(data: any): any {
  if (propertiesName.length in data) {
    data[propertiesName.length] = new BigNumber(data[propertiesName.length]);
  }
  return data;
}

export function postProcessingEntity(entity: string, data: any) {
  switch (entity) {
    case "forges":
      return forges(data);
    case "marketFactorys":
      return marketFactorys(data);
    case "yieldContracts":
      return yieldContracts(data);
    case "tokens":
      return tokens(data);
    case "mintYieldTokens":
      return mintYieldTokens(data);
    case "redeemYieldTokens":
      return redeemYieldTokens(data);
    case "pairs":
      return pairs(data);
    case "swaps":
      return swaps(data);
    case "users":
      return users(data);
    case "liquidityMinings":
      return liquidityMinings(data);
    case "liquidityMiningExpirys":
      return liquidityMiningExpirys(data);
    case "liquidityPositions":
      return liquidityPositions(data);
    case "liquidityPositionSnapshots":
      return liquidityPositionSnapshots(data);
    case "transactions":
      return transactions(data);
    case "mintLPTokens":
      return mintLPTokens(data);
    case "burnLPTokens":
      return burnLPTokens(data);
    case "pendleDatas":
      return pendleDatas(data);
    case "liquidityPools":
      return liquidityPools(data);
    case "pairHourDatas":
      return pairHourDatas(data);
    case "pairDailyDatas":
      return pairDailyDatas(data);
    case "uniswapPools":
      return uniswapPools(data);
    case "uniswapTokenPrices":
      return uniswapTokenPrices(data);
    case "sushiswapPairs":
    case "otpairs":
      return sushiswapPairs(data);
    case "sushiswapPairHourDatas":
      return sushiswapPairHourDatas(data);
    case "userMarketDatas":
      return userMarketDatas(data);
    case "lpTransferEvents":
      return lpTransferEvents(data);
    case "debugLogs":
      return debugLogs(data);
  }
}
