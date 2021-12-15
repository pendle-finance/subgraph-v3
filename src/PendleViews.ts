import BigNumber from "bignumber.js";
import { request, gql } from "graphql-request";
import { PendleSubgraphSDK } from "..";
import { getCurrentTimestamp } from "./utils/helpers";

// 0x685d32f394a5f03e78a1a0f6a91b4e2bf6f52cfe

const swapFee: BigNumber = new BigNumber("0.01");

export async function ytPairView(ytPair: string, sdk: PendleSubgraphSDK) {
  let timestamp = getCurrentTimestamp();
  let queryString = gql`
        {
            pair(id: \"${ytPair}\") {
                reserveUSD,
                lpAPR,
                lpStaked,
                lpStakedUSD,
                lpPriceUSD
                pairHourData(where: {
                    hourStartUnix_gte: ${timestamp - 3600 * 24}
                }) {
                    hourlyVolumeUSD
                }
            }
        }
    `;

  let data = (await request(sdk.apiUrl, queryString)).pair;
  let tradedVolume = new BigNumber(0);
  for (let hour of data.pairHourData) {
    tradedVolume = tradedVolume.plus(new BigNumber(hour.hourlyVolumeUSD));
  }

  let swapInterest = tradedVolume.times(swapFee);
  let swapApr = swapInterest.div(new BigNumber(data.reserveUSD)).times(365);

  return {
    lpStaked: new BigNumber(data.lpStaked),
    lpStakedUSD: new BigNumber(data.lpStakedUSD),
    lpPriceUSD: new BigNumber(data.lpPriceUSD),
    availableLiquidityUSD: new BigNumber(data.reserveUSD),
    lpAPR: new BigNumber(data.lpAPR).times(100),
    swapApr: swapApr.times(100),
  };
}
