import BigNumber from "bignumber.js";
import { request, gql } from "graphql-request";

// Fetch token price from Uniswap
async function getTokenPrice(tokenAddress: string) {
    let data = await request(
        "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
        gql`{
            tokenDayDatas(first:1, where:{
              token: \"${tokenAddress}\"
            }, orderBy: date, orderDirection: desc) {
              priceUSD
            }
          }
        `          
    );
    return data.tokenDayDatas[0].priceUSD;
}

async function getMasterChefInfo() {
    let data = await request(
        "https://api.thegraph.com/subgraphs/name/sushiswap/sushiswap",
        gql`{
                masterChefs(first: 5) {
                    id
                    totalAllocPoint
                    poolLength
                }
                masterChefPools(where:{lpToken:"0xb124c4e18a282143d362a066736fd60d22393ef4"}) {
                    id
                    balance
                    lpToken
                    allocPoint
                }
            }            
        `
    );
    return {
        allocPoint: new BigNumber(data.masterChefPools[0].allocPoint),
        totalAllocPoint: new BigNumber(data.masterChefs[0].totalAllocPoint),
        totalStaked: new BigNumber(data.masterChefPools[0].balance)
    }
}

export async function getSushiInformation(lpPrice: BigNumber) {
    const SUSHI_TOKEN = "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2";
    const SUSHI_PER_EPOCH = new BigNumber(100);
    const AVERAGE_BLOCK_PER_YEAR = new BigNumber(6466 * 365);

    let sushiPrice = new BigNumber(await getTokenPrice(SUSHI_TOKEN));
    let masterChefInfo = await getMasterChefInfo();
    let totalValueStaked = masterChefInfo.totalStaked.times(lpPrice);

    return SUSHI_PER_EPOCH.times(sushiPrice)
            .times(masterChefInfo.allocPoint)
            .div(masterChefInfo.totalAllocPoint)
            .div(totalValueStaked)
            .times(AVERAGE_BLOCK_PER_YEAR)
            .times(new BigNumber(100)); 
}

export function getCurrentTimestamp() {
    let curHour = Math.floor(Date.now() / 1000);
    return curHour;
}