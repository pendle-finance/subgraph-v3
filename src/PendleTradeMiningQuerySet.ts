import BigNumber from "bignumber.js";
import { PendleSubgraphSDK } from "..";
import { smoothPairDayDatas, smoothPairHourDatas } from "./post-processing";
import { entitiesName, propertiesName, sorting } from "./utils/consts";
import { request, gql } from "graphql-request";

export class PendleTradeMiningQuerySet {
  sdk: PendleSubgraphSDK;
  constructor(network: number | string) {
    this.sdk = new PendleSubgraphSDK(network);
  }

  public async getTopTraders(phase: string, house: string, numOfUsers: number) {
    return request(
      this.sdk.apiUrl,
      gql`
        {
          tradeMiningUsers(first: ${numOfUsers}, where: { phase: "${phase}", house: "${house}" }, orderBy:volumeUSD, orderDirection:desc) {
            house
            userAddress
            volumeUSD
            phase
          }
        }
      `
    );
  }

  public async getUserRank(phase: string, house: string, userAddress: string) {
    return request(
      this.sdk.apiUrl,
      gql`
        {
          tradeMiningUsers(
            first: 1
            where: {
              phase: "${phase}"
              house: "${house}"
              userAddress: "${userAddress}"
            }
          ) {
            house
            userAddress
            volumeUSD
            phase
          }
        }
      `
    );
  }

  public async getTotalTradedVolume(phase: string, house: string) {
    return request(
      this.sdk.apiUrl,
      gql`
          {
            tradeMiningHouses(
              first: 1
              where: {
                phase: "${phase}"
                house: "${house}"
              }
            ) {
              house
              volumeUSD
              phase
            }
          }
        `
    );
  }
}
