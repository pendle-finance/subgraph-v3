# Pendle Subgraph

## Queries
For use of querying and playing around, please refer to [this subgraph](https://thegraph.com/legacy-explorer/subgraph/ngfam/pendle).

## Key Entities Overview

### Forge
Contains all forges deployed by Pendle (Aave forge, Compound forge,...).

### YieldContracts
Contains all yield contract deployed and used on Pendle. For example (aUSDC-29DEC2022) is one of them. This entity includes the `lockedVolumeUSD`, `mintedVolumeUSD` and `redeemedVolumeUSD` of the yield contract itself.

### Token
Contains all tokens using on Pendle's protocol (xyt, ot, usdc,...)

### Pair
Contains all official pairs of token being traded on Pendle protocol. The key properties are:
- `reserveUSD`
- `token0Price`, `token1Price` (exchange rates between tokens)

### SushiswapPair
Pendle is having Sushiswap to trade their OT tokens. So we include all sushiswap pairs that has have either of the tokens being our OT.

### MintLPToken, BurnLPToken, Swap
All actions happened accross Pendle pairs.

## To developers
The deploy commands in `package.json` requires SUBGRAPH_ACCESS_TOKEN environment variable to be exported. If you are a Pendlee, please notify ngfam for the token.

If not, please write your own deploying script.