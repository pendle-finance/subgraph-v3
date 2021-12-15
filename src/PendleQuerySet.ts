import BigNumber from "bignumber.js";
import { PendleSubgraphSDK } from "..";
import { smoothPairDayDatas, smoothPairHourDatas } from "./post-processing";
import { entitiesName, propertiesName, sorting } from "./utils/consts";
import { getSushiInformation } from "./utils/helpers";
import * as views from "./PendleViews";

export class PendleQuerySet {
  sdk: PendleSubgraphSDK;
  constructor(network: number | string) {
    this.sdk = new PendleSubgraphSDK(network);
  }

  public async getCandlestickDatas(
    pairAddress: string,
    chartType: string,
    numberOfCandles: number
  ): Promise<any> {
    let curTimestamp = Math.floor(Date.now() / 3600 / 1000) * 3600;
    pairAddress = pairAddress.toLowerCase();
    const sdk = this.sdk;
    let hoursToQuery: number = numberOfCandles;

    let candles;
    if (chartType == "hourly") {
      candles = (
        await sdk.query([
          {
            entityName: entitiesName.PairHourData,
            first: 1000,
            where: {
              [propertiesName.pair]: pairAddress,
              [propertiesName.hourStartUnix + "_gte"]:
                curTimestamp - (hoursToQuery + 1) * 3600,
            },
            properties: [
              propertiesName.yieldTokenPrice_open,
              propertiesName.yieldTokenPrice_close,
              propertiesName.yieldTokenPrice_low,
              propertiesName.yieldTokenPrice_high,
            ],
            orderBy: propertiesName.hourStartUnix,
            orderDirection: "desc",
          },
        ])
      ).pairHourDatas;
      candles = smoothPairHourDatas(candles, hoursToQuery);
    } else {
      candles = (
        await sdk.query([
          {
            entityName: entitiesName.PairDailyData,
            first: 1000,
            where: {
              [propertiesName.pair]: pairAddress,
              [propertiesName.dayStartUnix + "_gte"]:
                curTimestamp - (hoursToQuery + 1) * 86400,
            },
            properties: [
              propertiesName.yieldTokenPrice_open,
              propertiesName.yieldTokenPrice_close,
              propertiesName.yieldTokenPrice_low,
              propertiesName.yieldTokenPrice_high,
            ],
            orderBy: propertiesName.dayStartUnix,
            orderDirection: "desc",
          },
        ])
      ).pairDailyDatas;
      candles = smoothPairDayDatas(candles, hoursToQuery);
    }

    candles.reverse();

    for (let i = 0; i < candles.length; ++i) {
      if (chartType == "hourly") {
        candles[i].startTimestamp = candles[i].hourStartUnix;
      } else {
        candles[i].startTimestamp = candles[i].dayStartUnix;
      }
    }

    for (let i = 1; i < candles.length; ++i) {
      candles[i].yieldTokenPrice_open = new BigNumber(
        candles[i - 1].yieldTokenPrice_close
      );
    }
    return candles;
  }

  public async otPairData(pairAddress: string) {
    let entityName = entitiesName.SushiswapPair;

    if (this.sdk.apiUrl.includes("avalanche")) {
      entityName = entitiesName.OTPair;
    }

    pairAddress = pairAddress.toLowerCase();
    const sdk = this.sdk;
    const response = await sdk.query([
      {
        entityName,
        first: 1,
        where: {
          [propertiesName.id]: pairAddress,
        },
        properties: [
          propertiesName.otPrice,
          propertiesName.baseTokenPrice,
          propertiesName.marketWorthUSD,
          propertiesName.otBalance,
          propertiesName.baseTokenBalance,
          propertiesName.aprPercentage,
          propertiesName.updatedAt,
          propertiesName.lpPrice,
          propertiesName.totalStaked,
        ],
      },
    ]);
    let otPool = response[entityName][0];

    otPool.otRate = otPool.baseTokenBalance.div(otPool.otBalance);
    otPool.baseTokenRate = otPool.otBalance.div(otPool.baseTokenBalance);

    if (pairAddress == "0xb124c4e18a282143d362a066736fd60d22393ef4") {
      otPool.aprPercentage = otPool.aprPercentage.plus(
        await getSushiInformation(otPool.lpPrice)
      );
    }

    return {
      otPrice: otPool.otPrice,
      otBalance: otPool.otBalance,
      otRate: otPool.otRate,
      baseTokenPrice: otPool.baseTokenPrice,
      baseTokenBalance: otPool.baseTokenBalance,
      baseTokenRate: otPool.baseTokenRate,
      availableLiquidityUSD: otPool.marketWorthUSD,
      totalStakedUSD: otPool.totalStaked * otPool.lpPrice,
      updatedAt: otPool.updatedAt,
      otApr: otPool.aprPercentage,
      totalStaked: otPool.totalStaked,
    };
  }

  public async otRates(pairAddress: string) {
    let otPool = await this.otPairData(pairAddress);
    return {
      otRate: otPool.otRate,
      baseTokenRate: otPool.baseTokenRate,
      otPrice: otPool.otPrice,
      baseTokenPrice: otPool.baseTokenPrice,
    };
  }

  public async ytMarket(pairAddress: string) {
    pairAddress = pairAddress.toLowerCase();
    return views.ytPairView(pairAddress, this.sdk);
  }

  public async userLiquidityInfo(pairAddress: string, userAddress: string) {
    try {
      let info = (
        await this.sdk.query([
          {
            entityName: entitiesName.UserMarketData,
            first: 1,
            where: {
              [propertiesName.market]: pairAddress.toLowerCase(),
              [propertiesName.user]: userAddress.toLowerCase(),
            },
            properties: [
              propertiesName.yieldClaimedRaw,
              propertiesName.yieldClaimedUsd,
              propertiesName.capitalProvided,
              propertiesName.capitalWithdrawn,
              propertiesName.pendleRewardReceivedUSD,
              propertiesName.pendleRewardReceivedRaw,
              propertiesName.recordedUSDValue,
            ],
          },
        ])
      ).userMarketDatas[0];

      return {
        totalCapitalProvided: info.capitalProvided,
        totalCapitalWithdrawn: info.capitalWithdrawn,
        lpMarketValue: info.recordedUSDValue,
        yieldAccuredUsd: info.yieldClaimedUsd,
        yieldAccuredRaw: info.yieldClaimedRaw,
        pendleClaimedUsd: info.pendleRewardReceivedUSD,
        pendleClaimedRaw: info.pendleRewardReceivedRaw,
      };
    } catch (err) {
      return {
        totalCapitalProvided: new BigNumber(0),
        totalCapitalWithdrawn: new BigNumber(0),
        lpMarketValue: new BigNumber(0),
        yieldAccuredUsd: new BigNumber(0),
        yieldAccuredRaw: new BigNumber(0),
        pendleClaimedUsd: new BigNumber(0),
        pendleClaimedRaw: new BigNumber(0),
      };
    }
  }
}
