import { request, gql } from "graphql-request";
import { postProcessingReceivedData } from "./post-processing";
import { entitiesName, propertiesName } from "./utils/consts";

export interface WhereParams {
  [name: string]: any;
}

export interface EntityQuery {
  entityName: string;
  first: number;
  where?: WhereParams | string;
  properties: string[];
  extraProperties?: string[];

  orderBy?: string;
  orderDirection?: string;
}

const subgraphApiNetworkMappings: Record<number | string, string> = {
  1: "https://api.thegraph.com/subgraphs/name/ngfam/pendle",
  mainnet: 'https://api.thegraph.com/subgraphs/name/ngfam/pendle',
  42: "https://api.thegraph.com/subgraphs/name/ngfam/pendle-kovan",
  kovan: "https://api.thegraph.com/subgraphs/name/ngfam/pendle-kovan",
  137: "https://api.thegraph.com/subgraphs/name/ngfam/pendle-polygon",
  polygon: "https://api.thegraph.com/subgraphs/name/ngfam/pendle-polygon",
  avalanche: "https://api.thegraph.com/subgraphs/name/ngfam/pendle-avalanche",
  43114: "https://api.thegraph.com/subgraphs/name/ngfam/pendle-avalanche"
}

export class PendleSubgraphSDK {
  apiUrl: string;
  constructor(network: string | number) {
    this.apiUrl = subgraphApiNetworkMappings[network];
    if(this.apiUrl) return;
    this.apiUrl = network as string;
    if (!this.apiUrl.startsWith("https://api.thegraph.com")) {
      throw new Error("Unsupported network or wrong endpoint URL!");
    }
    
  }

  private getWhereParams(where: WhereParams | string): string {
    if (typeof(where) == "string") {
      return where;
    }

    let whereParams: string[] = [];
    for (let property in where) {
      let value = where[property];
      if (typeof value == "string") {
        whereParams.push(`${property}: \"${value}\"`);
      } else {
        whereParams.push(`${property}: ${value}`);
      }
    }
    return whereParams.join(",");
  }

  private getParams(entity: EntityQuery): string {
    let paramsList: string[] = [`first: ${entity.first}`];
    if (entity.orderBy) {
      paramsList.push(`orderBy: ${entity.orderBy}`);
    }
    if (entity.orderDirection) {
      paramsList.push(`orderDirection: ${entity.orderDirection}`);
    }
    if (entity.where) {
      paramsList.push(`where: {${this.getWhereParams(entity.where)}}`);
    }
    return paramsList.join(",");
  }

  private getEntityQuery(entity: EntityQuery): string {
    let entityString: string = "";
    entityString += `${entity.entityName}(${this.getParams(entity)}){
            ${entity.properties.join(",")}
        }`;
    return entityString;
  }

  public async query(params: EntityQuery[]): Promise<any> {
    let queryString = "{";
    for (let entity of params) {
      queryString += this.getEntityQuery(addMandatoryProperties(entity));
    }
    queryString += "}";
    return postProcessingReceivedData(
      await request(
        this.apiUrl,
        gql`
          ${queryString}
        `
      )
    );
  }
}

function addMandatoryProperties(entity: EntityQuery) {
	entity.properties.push(propertiesName.id);
  if (entity.entityName == entitiesName.PairHourData) {
    entity.properties.push("pair { id }");
    entity.properties.push(propertiesName.hourStartUnix);
    entity.properties.push(propertiesName.yieldTokenPrice_close);
  }
  if (entity.entityName == entitiesName.PairDailyData) {
    entity.properties.push("pair { id }");
    entity.properties.push(propertiesName.dayStartUnix);
    entity.properties.push(propertiesName.yieldTokenPrice_close);
  }
  return entity;
}
