import { request, gql } from "graphql-request";
import { PendleSubgraphSDK } from "./src/PendleSubgraphSDK";
import { propertiesName, entitiesName, sorting } from "./src/utils/consts";

import { PendleTradeMiningQuerySet } from "./src/PendleTradeMiningQuerySet"; // @pendle/subgraph-sdk
import { PendleQuerySet } from "./src/PendleQuerySet"; // @pendle/subgraph-sdk

async function main() {
  let qs = new PendleTradeMiningQuerySet("avalanche");
    let data = await qs.getTotalTradedVolume("1", "BenQi");
  //   let data = await qs.getTopTraders("1", "BenQi", 10);
//   let data = await qs.getUserRank(
//     "1",
//     "BenQi",
//     "0xf8865de3BEe5c84649b14F077B36A8f90eE90FeC".toLowerCase()
//   );

  console.log(data);
}

// main();

export {
  PendleSubgraphSDK,
  propertiesName,
  entitiesName,
  sorting,
  PendleQuerySet,
  PendleTradeMiningQuerySet,
};
