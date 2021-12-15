export const entitiesName = {
	Forge: "forges",
	MarketFactory: "marketFactorys",
	YieldContract: "yieldContracts",
	Token: "tokens",
	MintYieldToken: "mintYieldTokens",
	RedeemYieldToken: "redeemYieldTokens",
	Pair: "pairs",
	Swap: "swaps",
	User: "users",
	LiquidityMining: "liquidityMinings",
	LiquidityMiningExpiry: "liquidityMiningExpirys",
	LiquidityPosition: "liquidityPositions",
	LiquidityPositionSnapshot: "liquidityPositionSnapshots",
	Transaction: "transactions",
	MintLPToken: "mintLPTokens",
	BurnLPToken: "burnLPTokens",
	PendleData: "pendleDatas",
	LiquidityPool: "liquidityPools",
	PairHourData: "pairHourDatas",
	PairDailyData: "pairDailyDatas",
	UniswapPool: "uniswapPools",
	UniswapTokenPrice: "uniswapTokenPrices",
	SushiswapPair: "sushiswapPairs",
	SushiswapPairHourData: "sushiswapPairHourDatas",
	OTPair: "otpairs",
	UserMarketData: "userMarketDatas",
	LpTransferEvent: "lpTransferEvents",
	DebugLog: "debugLogs",
};

export const propertiesName = {
	id: "id",
	forgeId: "forgeId",
	underlyingAsset: "underlyingAsset",
	xyt: "xyt",
	ot: "ot",
	expiry: "expiry",
	mintTxCount: "mintTxCount",
	redeemTxCount: "redeemTxCount",
	interestSettledTxCount: "interestSettledTxCount",
	lockedVolume: "lockedVolume",
	mintVolume: "mintVolume",
	redeemVolume: "redeemVolume",
	lockedVolumeUSD: "lockedVolumeUSD",
	mintVolumeUSD: "mintVolumeUSD",
	redeemVolumeUSD: "redeemVolumeUSD",
	interestSettledVolume: "interestSettledVolume",
	yieldBearingAsset: "yieldBearingAsset",
	symbol: "symbol",
	name: "name",
	decimals: "decimals",
	totalSupply: "totalSupply",
	tradeVolume: "tradeVolume",
	tradeVolumeUSD: "tradeVolumeUSD",
	txCount: "txCount",
	totalLiquidity: "totalLiquidity",
	blockNumber: "blockNumber",
	timestamp: "timestamp",
	amountToTokenize: "amountToTokenize",
	amountMinted: "amountMinted",
	xytAsset: "xytAsset",
	otAsset: "otAsset",
	yieldContract: "yieldContract",
	mintedValueUSD: "mintedValueUSD",
	amountToRedeem: "amountToRedeem",
	amountRedeemed: "amountRedeemed",
	redeemedValueUSD: "redeemedValueUSD",
	token1: "token1",
	reserve0: "reserve0",
	reserve1: "reserve1",
	token0WeightRaw: "token0WeightRaw",
	token1WeightRaw: "token1WeightRaw",
	reserveUSD: "reserveUSD",
	token0Price: "token0Price",
	token1Price: "token1Price",
	volumeToken0: "volumeToken0",
	volumeToken1: "volumeToken1",
	volumeUSD: "volumeUSD",
	feesToken0: "feesToken0",
	feesToken1: "feesToken1",
	feesUSD: "feesUSD",
	createdAtTimestamp: "createdAtTimestamp",
	createdAtBlockNumber: "createdAtBlockNumber",
	lpPriceUSD: "lpPriceUSD",
	lpStaked: "lpStaked",
	lpStakedUSD: "lpStakedUSD",
	pairHourData: "pairHourData",
	liquidityMining: "liquidityMining",
	lpAPR: "lpAPR",
	yieldTokenHolderAddress: "yieldTokenHolderAddress",
	pair: "pair",
	sender: "sender",
	inToken: "inToken",
	outToken: "outToken",
	inAmount: "inAmount",
	outAmount: "outAmount",
	to: "to",
	logIndex: "logIndex",
	feesCollected: "feesCollected",
	feesCollectedUSD: "feesCollectedUSD",
	amountUSD: "amountUSD",
	liquidityPositions: "liquidityPositions",
	usdSwapped: "usdSwapped",
	lmAddress: "lmAddress",
	marketAddress: "marketAddress",
	user: "user",
	liquidityTokenBalance: "liquidityTokenBalance",
	liquidityPosition: "liquidityPosition",
	lpMints: "lpMints",
	lpBurns: "lpBurns",
	swaps: "swaps",
	mintYieldTokens: "mintYieldTokens",
	redeemYieldTokens: "redeemYieldTokens",
	transaction: "transaction",
	liquidity: "liquidity",
	amount0: "amount0",
	amount1: "amount1",
	feeTo: "feeTo",
	feeLiquidity: "feeLiquidity",
	needsComplete: "needsComplete",
	protocolSwapFee: "protocolSwapFee",
	swapFee: "swapFee",
	exitFee: "exitFee",
	inToken0: "inToken0",
	inToken1: "inToken1",
	inAmount0: "inAmount0",
	inAmount1: "inAmount1",
	swapFeesCollectedUSD: "swapFeesCollectedUSD",
	swapVolumeUSD: "swapVolumeUSD",
	lpAmount: "lpAmount",
	hourStartUnix: "hourStartUnix",
	marketWorthUSD: "marketWorthUSD",
	hourlyVolumeToken0: "hourlyVolumeToken0",
	hourlyVolumeToken1: "hourlyVolumeToken1",
	hourlyVolumeUSD: "hourlyVolumeUSD",
	hourlyTxns: "hourlyTxns",
	yieldTokenPrice_open: "yieldTokenPrice_open",
	yieldTokenPrice_close: "yieldTokenPrice_close",
	yieldTokenPrice_high: "yieldTokenPrice_high",
	yieldTokenPrice_low: "yieldTokenPrice_low",
	lpTokenPrice: "lpTokenPrice",
	baseTokenPrice: "baseTokenPrice",
	yieldBearingAssetPrice: "yieldBearingAssetPrice",
	impliedYield: "impliedYield",
	dayStartUnix: "dayStartUnix",
	dailyVolumeToken0: "dailyVolumeToken0",
	dailyVolumeToken1: "dailyVolumeToken1",
	dailyVolumeUSD: "dailyVolumeUSD",
	dailyTxns: "dailyTxns",
	poolAddress: "poolAddress",
	token0Address: "token0Address",
	token1Address: "token1Address",
	hasBeenUsed: "hasBeenUsed",
	price: "price",
	otToken: "otToken",
	baseToken: "baseToken",
	baseTokenBalance: "baseTokenBalance",
	otBalance: "otBalance",
	otPrice: "otPrice",
	totalTradingUSD: "totalTradingUSD",
	totalStaked: "totalStaked",
	totalReward: "totalReward",
	lpPrice: "lpPrice",
	isOtToken0: "isOtToken0",
	aprPercentage: "aprPercentage",
	updatedAt: "updatedAt",
	otAddress: "otAddress",
	tradingVolumeUSD: "tradingVolumeUSD",
	market: "market",
	lpHolding: "lpHolding",
	recordedUSDValue: "recordedUSDValue",
	capitalProvided: "capitalProvided",
	capitalWithdrawn: "capitalWithdrawn",
	yieldClaimedUsd: "yieldClaimedUsd",
	yieldClaimedRaw: "yieldClaimedRaw",
	pendleRewardReceivedRaw: "pendleRewardReceivedRaw",
	pendleRewardReceivedUSD: "pendleRewardReceivedUSD",
	from: "from",
	amount: "amount",
	block: "block",
	message: "message",
	type: "type",
	length: "length",
};

export const sorting = {
  ascending: "asc",
  increasing: "asc",
  decreasing: "desc",
  descending: "desc",
};
