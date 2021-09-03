import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { SushiswapPair } from "../../generated/SushiswapFactory/SushiswapPair";
import { getTokenPrice } from "../pricing";
import { getUniswapEthPrice } from "../uniswap/pricing";
import {
  PENDLE_ETH_SUSHISWAP,
  PENDLE_TOKEN_ADDRESS,
  TWO_BD,
  WETH_ADDRESS
} from "../utils/consts";
import { convertTokenToDecimal, getBalanceOf } from "../utils/helpers";
import { loadToken } from "../utils/load-entity";

export function getSushiLpPrice(lpAddress: Address): BigDecimal {
  let sushiContract = SushiswapPair.bind(lpAddress);
  let totalSupply = convertTokenToDecimal(
    sushiContract.totalSupply(),
    loadToken(lpAddress).decimals
  );
  let token = loadToken(sushiContract.token0());
  let tokenPrice = getTokenPrice(token as Token);
  let tokenBalance = convertTokenToDecimal(
    sushiContract.getReserves().value0,
    token.decimals
  );
  return tokenBalance
    .times(tokenPrice)
    .times(TWO_BD)
    .div(totalSupply);
}

export function getPendlePrice(): BigDecimal {
  let pendleBalance = getBalanceOf(PENDLE_TOKEN_ADDRESS, PENDLE_ETH_SUSHISWAP);
  let wethBalance = getBalanceOf(WETH_ADDRESS, PENDLE_ETH_SUSHISWAP);
  let wethPrice = getUniswapEthPrice();
  return wethPrice.times(wethBalance).div(pendleBalance);
}
