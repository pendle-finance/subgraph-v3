import BigNumber from "bignumber.js";

export function deepCopy(target: any) {
    return JSON.parse(JSON.stringify(target));
}