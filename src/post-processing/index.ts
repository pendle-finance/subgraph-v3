import BigNumber from "bignumber.js";
import { entitiesName, propertiesName } from "../utils/consts";
import { deepCopy } from "../utils/utilities";
import { postProcessingEntity } from "./simpleProcessing";

export function postProcessingReceivedData(receivedData: any): any {
  for (let entity in receivedData) {
    if (entity == entitiesName.PairHourData || entity == entitiesName.PairDailyData) continue;
    for (let i = 0; i < receivedData[entity].length; ++i) {
      receivedData[entity][i] = postProcessingEntity(
        entity,
        receivedData[entity][i]
      );
    }
  }
  return receivedData;
}

export function smoothPairHourDatas(data: any, nRequired: number): any {
  let pointer = 0;
  let newData = [];
  let curHour = Math.floor(Date.now() / 3600 / 1000) * 3600;

  for (let i = 0; i < nRequired; ++i) {
    let flag: boolean = false;
    while(pointer < data.length) {
      if (data[pointer].hourStartUnix == curHour) {
        newData.push(deepCopy(data[pointer]));
        flag = true;
        break;
      }

      if (data[pointer].hourStartUnix < curHour) {
        let curHourData = deepCopy(data[pointer]);
        curHourData.id = data[pointer].pair.id + '-' + (curHour/3600).toString();
        curHourData.hourStartUnix = curHour;
        
        // Zero variables
        for (let property of [
          propertiesName.hourlyTxns,
          propertiesName.hourlyVolumeToken0,
          propertiesName.hourlyVolumeToken1,
          propertiesName.hourlyVolumeUSD,
        ]) {
          if (property in curHourData) {
            curHourData[property] = new BigNumber(0);
          }
        }

        // open close variables
        if (propertiesName.yieldTokenPrice_close in data[pointer]) {
          for (let property of [
            propertiesName.yieldTokenPrice_open,
            propertiesName.yieldTokenPrice_close,
            propertiesName.yieldTokenPrice_low,
            propertiesName.yieldTokenPrice_high,
          ]) {
            if (property in curHourData) {
              curHourData[property] = new BigNumber(
                data[pointer].yieldTokenPrice_close
              );
            }
          }
        }
        newData.push(curHourData);
        flag = true;
        break;
      }
      pointer += 1;
    }

    if (!flag) {
      break;
    }
    curHour -= 3600;
  }

  for(let i = 0; i < newData.length; ++i) {
    newData[i] = postProcessingEntity(entitiesName.PairHourData, newData[i]);
  }
  return newData;
}

export function smoothPairDayDatas(data: any, nRequired: number): any {
  let pointer = 0;
  let newData = [];
  let curDay = Math.floor(Date.now() / 86400 / 1000) * 86400;

  for (let i = 0; i < nRequired; ++i) {
    let flag: boolean = false;
    while(pointer < data.length) {
      if (data[pointer].dayStartUnix == curDay) {
        newData.push(deepCopy(data[pointer]));
        flag = true;
        break;
      }

      if (data[pointer].dayStartUnix < curDay) {
        let curDayData = deepCopy(data[pointer]);
        curDayData.id = data[pointer].pair.id + '-' + (curDay/86400).toString();
        curDayData.dayStartUnix = curDay;
        
        // Zero variables
        for (let property of [
          propertiesName.dailyTxns,
          propertiesName.dailyVolumeToken0,
          propertiesName.dailyVolumeToken1,
          propertiesName.dailyVolumeUSD,
        ]) {
          if (property in curDayData) {
            curDayData[property] = new BigNumber(0);
          }
        }

        // open close variables
        if (propertiesName.yieldTokenPrice_close in data[pointer]) {
          for (let property of [
            propertiesName.yieldTokenPrice_open,
            propertiesName.yieldTokenPrice_close,
            propertiesName.yieldTokenPrice_low,
            propertiesName.yieldTokenPrice_high,
          ]) {
            if (property in curDayData) {
              curDayData[property] = new BigNumber(
                data[pointer].yieldTokenPrice_close
              );
            }
          }
        }
        newData.push(curDayData);
        flag = true;
        break;
      }
      pointer += 1;
    }

    if (!flag) {
      break;
    }
    curDay -= 86400;
  }

  for(let i = 0; i < newData.length; ++i) {
    newData[i] = postProcessingEntity(entitiesName.PairDailyData, newData[i]);
  }
  return newData;
}
