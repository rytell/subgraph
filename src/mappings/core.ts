/* eslint-disable prefer-const */
import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts";
import {
  Bundle,
  Burn as BurnEvent,
  Mint as MintEvent,
  Pair,
  RytellFactory,
  Swap as SwapEvent,
  Token,
  Transaction
} from "../types/schema";
import {
  Burn,
  Mint,
  Pair as PairContract,
  Swap,
  Sync,
  Transfer
} from "../types/templates/Pair/Pair";
import {
  updatePairDayData,
  updatePairHourData,
  updateRytellDayData,
  updateTokenDayData
} from "./dayUpdates";
import {
  ADDRESS_ZERO,
  BI_18,
  convertTokenToDecimal,
  createLiquidityPosition,
  createLiquiditySnapshot,
  createUser,
  FACTORY_ADDRESS,
  ONE_BI,
  ROUTER_ADDRESS,
  ZERO_BD
} from "./helpers";
import {
  findEthPerToken,
  getEthPriceInUSD,
  getTrackedLiquidityUSD,
  getTrackedVolumeUSD
} from "./pricing";

let MINING_POOLS: string[] = [
  '0x1081e6063dbe43e7150ec7d28a705bec98dfe070', // PARTY/AVAX (20X)
  '0x839b20d7f8b5d2b6ec07cf126a4bb51b9b67de60', // PARTY/DAI.e (10X)
  '0x04fa5d713f256a785e39385ae071cb05adba97f8', // PARTY/DAI.e delisted
  '0xb4be4ac1a0a3bd381da8e9adf3176413a590e282', // PARTY/USDT.e (10X)
  '0x5a4f44127ec4bd4164b09db623a9d65523d53434', // PARTY/USDT.e delisted
  '0x9201908b21115fee17db08cea775c5d05851a6ca', // AVAX/WBTC.e (3X)
  '0x1d948ba1d22cd8091a56d45cd01c92b3d5327452', // AVAX/USDT.e
  '0x23dfe0622a4fae8da02a6b517952bcebba0e9b3b', // AVAX/USDC.e
  '0xc8dfff529d1ff649422905db9df05c8c3ddc04a7', // AVAX/DAI.e
  '0x897c3e7a9baecf1d096ab480e50149e952fbb7f0', // AVAX/WETH.e (3X)
  '0xe5cacbb457a3d96051c581615184da5660286798', // AVAX/LINK.e (3X)
  '0xb466124bd5ed4851f96a3ca18f099ffef7be2612', // AVAX/RenDOGE (3X)
  '0xf9ac26a28b5da299e8ff51f2f8eab9cba911668b', // AVAX/aaBLOCK (2X)
  '0x1fa07d1481e264f4ffe857c918ce27e841ba427b', // AVAX/SPORE (2X) (COULD NOT GET A SWAP IN PANGOLIN) 
  '0x15c509a700589fd069f7bfbc12e07f2a7b018459', // AVAX/SPORE (2X) (COULD NOT GET A SWAP IN PANGOLIN) - Why 2???
  '0x8adc76373b7c8fd9154528bed63e6ff30411ceb4', // AVAX/BAG (2X)
  '0xe5f2bde8f9e23bff7d9af7f4f6d98e1efc08a365', // AVAX/PNG (1X)
  '0x6665a74b3bbe312d01d8ffa9d2a078798a216c87', // AVAX/PEFI (2X)
  '0x1a70d0acc5eba0c8515911301a8b0ee5f5070c66', // AVAX/SNOB (1X)
  '0x398382a060319261cf5819afb18243615c090845', // AVAX/ELK (1X)
  '0xb247f29bed505052bbebe911d4691e93485aaf83', // AVAX/ELK old-address delisted
  '0xb7517d0f70a6c884239345b0ac8aafd436227aa8', // AVAX/XAVA (2X)
  '0x12711334db498ba2768161335016e2724a15e4e8', // AVAX/AVME (1X)
  '0xaa0e5e6b3dabbc0c34bb2480791fe2409b630f0f', // AVAX/SHERPA (1X)
  '0x751c2f4a4b32d79b54fdf44c25e85b0aa5232bd0', // AVAX/YAK (2X)
  '0x30ac2b14320112a4922d5d3b926dcdcb19c502a8', // AVAX/QI (1X)
  '0x4a2ba12a8c13575d5dea30944f8d9bd78ef2e190', // AVAX/GB (4X)
  // PINATAS V2
  '0x5266799b9cf333463579960d3716eb413bcc2ff5', // PARTYV2/AVAX
  '0x7a55baf51dd3f366ea7598d6342272f9a53c0e31', // PARTYV2/USDT.e
  '0x9c0d4b2f228b1fea9309ebeb2c356fdcd3acbcb5', // AVAX/WBTC.e
  '0x8d72213c550429d7ee7bed92a6eb4cb33e6dc403', // AVAX/USDT.e
  '0xbfca11d1fd56f03c7ec615a825761cfefd38f772', // AVAX/WETH.e
  '0xb42d72727cdc2e3973d161357c46fc71b769d300', // AVAX/BAG
  '0x4dcaaecc91d98e4285811f01419ea0434ca2154d', // AVAX/PNG
  '0x590c4076059aa1c5139ddd421626108590b0547a', // AVAX/PEFI
  '0xd21fbc7c645a4d445d2ee8d40d5ce0aded2aa389', // AVAX/SNOB
  '0xbe413ae7643c9a834c81b20f870ec48bcdcf90cd', // AVAX/ELK
  '0x62d2668adc522fbd31323ac2dfc42ed94363022f', // AVAX/XAVA
  '0x9752571d26a1e1b557797311b4ff1b94a5ce99e4', // AVAX/AVME
  '0x37503d8f8672e6161a1f23f2f3569f36d6e667ff', // AVAX/SHERPA
  '0x56f121807db5eff52061b07015646d6f30079f93', // AVAX/QI
  '0x7e008e90eaa1ed0db4110418192ec609254fc29c', // AVAX/GB
  '0x8cdbc3c632ac5f4f2c5a1548c86b73182891675e', // USDT/USDC.e
  '0xd4fb7ac50f6a600ac3094c2dc56473db58957180'  // USDT/BUSD
]

function isCompleteMint(mintId: string): boolean {
  return MintEvent.load(mintId).sender !== null; // sufficient checks
}

export function handleTransfer(event: Transfer): void {
  // ignore initial transfers for first adds
  if (
    event.params.to.toHexString() == ADDRESS_ZERO &&
    event.params.value.equals(BigInt.fromI32(1000))
  ) {
    return;
  }

  // skip if staking/unstaking
  if (
    MINING_POOLS.includes(event.params.from.toHexString()) ||
    MINING_POOLS.includes(event.params.to.toHexString())
  ) {
    return;
  }

  let factory = RytellFactory.load(FACTORY_ADDRESS);
  let transactionHash = event.transaction.hash.toHexString();

  // user stats
  let from = event.params.from;
  createUser(from);
  let to = event.params.to;
  createUser(to);

  // get pair and load contract
  let pair = Pair.load(event.address.toHexString());
  let pairContract = PairContract.bind(event.address);

  // liquidity token amount being transfered
  let value = convertTokenToDecimal(event.params.value, BI_18);

  // get or create transaction
  let transaction = Transaction.load(transactionHash);
  if (transaction === null) {
    transaction = new Transaction(transactionHash);
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.mints = [];
    transaction.burns = [];
    transaction.swaps = [];
  }

  // mints
  let mints = transaction.mints;
  if (from.toHexString() == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value);
    pair.save();

    // create new mint if no mints so far or if last one is done already
    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
      let mint = new MintEvent(
        event.transaction.hash
          .toHexString()
          .concat("-")
          .concat(BigInt.fromI32(mints.length).toString())
      );
      mint.transaction = transaction.id;
      mint.pair = pair.id;
      mint.to = to;
      mint.liquidity = value;
      mint.timestamp = transaction.timestamp;
      mint.transaction = transaction.id;
      mint.save();

      // update mints in transaction
      transaction.mints = mints.concat([mint.id]);

      // save entities
      transaction.save();
      factory.save();
    }
  }

  // case where direct send first on ETH withdrawls
  if (event.params.to.toHexString() == pair.id) {
    let burns = transaction.burns;
    let burn = new BurnEvent(
      event.transaction.hash
        .toHexString()
        .concat("-")
        .concat(BigInt.fromI32(burns.length).toString())
    );
    burn.transaction = transaction.id;
    burn.pair = pair.id;
    burn.liquidity = value;
    burn.timestamp = transaction.timestamp;
    burn.to = event.params.to;
    burn.sender = event.params.from;
    burn.needsComplete = true;
    burn.transaction = transaction.id;
    burn.save();

    // TODO: Consider using .concat() for handling array updates to protect
    // against unintended side effects for other code paths.
    burns.push(burn.id);
    transaction.burns = burns;
    transaction.save();
  }

  // burn
  if (
    event.params.to.toHexString() == ADDRESS_ZERO &&
    event.params.from.toHexString() == pair.id
  ) {
    pair.totalSupply = pair.totalSupply.minus(value);
    pair.save();

    // this is a new instance of a logical burn
    let burns = transaction.burns;
    let burn: BurnEvent;
    if (burns.length > 0) {
      let currentBurn = BurnEvent.load(burns[burns.length - 1]);
      if (currentBurn.needsComplete) {
        burn = currentBurn as BurnEvent;
      } else {
        burn = new BurnEvent(
          event.transaction.hash
            .toHexString()
            .concat("-")
            .concat(BigInt.fromI32(burns.length).toString())
        );
        burn.transaction = transaction.id;
        burn.needsComplete = false;
        burn.pair = pair.id;
        burn.liquidity = value;
        burn.transaction = transaction.id;
        burn.timestamp = transaction.timestamp;
      }
    } else {
      burn = new BurnEvent(
        event.transaction.hash
          .toHexString()
          .concat("-")
          .concat(BigInt.fromI32(burns.length).toString())
      );
      burn.transaction = transaction.id;
      burn.needsComplete = false;
      burn.pair = pair.id;
      burn.liquidity = value;
      burn.transaction = transaction.id;
      burn.timestamp = transaction.timestamp;
    }

    // if this logical burn included a fee mint, account for this
    if (mints.length !== 0 && !isCompleteMint(mints[mints.length - 1])) {
      let mint = MintEvent.load(mints[mints.length - 1]);
      burn.feeTo = mint.to;
      burn.feeLiquidity = mint.liquidity;
      // remove the logical mint
      store.remove("Mint", mints[mints.length - 1]);
      // update the transaction

      // TODO: Consider using .slice().pop() to protect against unintended
      // side effects for other code paths.
      mints.pop();
      transaction.mints = mints;
      transaction.save();
    }
    burn.save();
    // if accessing last one, replace it
    if (burn.needsComplete) {
      // TODO: Consider using .slice(0, -1).concat() to protect against
      // unintended side effects for other code paths.
      burns[burns.length - 1] = burn.id;
    }
    // else add new one
    else {
      // TODO: Consider using .concat() for handling array updates to protect
      // against unintended side effects for other code paths.
      burns.push(burn.id);
    }
    transaction.burns = burns;
    transaction.save();
  }

  if (from.toHexString() != ADDRESS_ZERO && from.toHexString() != pair.id) {
    let fromUserLiquidityPosition = createLiquidityPosition(
      event.address,
      from
    );
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(
      convertTokenToDecimal(event.params.value, BI_18)
    );
    fromUserLiquidityPosition.save();
    createLiquiditySnapshot(fromUserLiquidityPosition, event);
  }

  if (
    event.params.to.toHexString() != ADDRESS_ZERO &&
    to.toHexString() != pair.id
  ) {
    let toUserLiquidityPosition = createLiquidityPosition(event.address, to);
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(
      convertTokenToDecimal(event.params.value, BI_18)
    );
    toUserLiquidityPosition.save();
    createLiquiditySnapshot(toUserLiquidityPosition, event);
  }

  transaction.save();
}

export function handleSync(event: Sync): void {
  let pair = Pair.load(event.address.toHex());
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  let partyswap = RytellFactory.load(FACTORY_ADDRESS);

  // reset factory liquidity by subtracting onluy tarcked liquidity
  partyswap.totalLiquidityETH = partyswap.totalLiquidityETH.minus(
    pair.trackedReserveETH as BigDecimal
  );

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);

  if (pair.reserve1.notEqual(ZERO_BD))
    pair.token0Price = pair.reserve0.div(pair.reserve1);
  else pair.token0Price = ZERO_BD;
  if (pair.reserve0.notEqual(ZERO_BD))
    pair.token1Price = pair.reserve1.div(pair.reserve0);
  else pair.token1Price = ZERO_BD;

  pair.save();

  // update ETH price now that reserves could have changed
  let bundle = Bundle.load("1");
  bundle.ethPrice = getEthPriceInUSD();
  bundle.save();

  token0.derivedETH = findEthPerToken(token0 as Token);
  token1.derivedETH = findEthPerToken(token1 as Token);
  token0.save();
  token1.save();

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityETH: BigDecimal;
  if (bundle.ethPrice.notEqual(ZERO_BD)) {
    trackedLiquidityETH = getTrackedLiquidityUSD(
      pair.reserve0,
      token0 as Token,
      pair.reserve1,
      token1 as Token
    ).div(bundle.ethPrice);
  } else {
    trackedLiquidityETH = ZERO_BD;
  }

  // use derived amounts within pair
  pair.trackedReserveETH = trackedLiquidityETH;
  pair.reserveETH = pair.reserve0
    .times(token0.derivedETH as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedETH as BigDecimal));
  pair.reserveUSD = pair.reserveETH.times(bundle.ethPrice);

  // use tracked amounts globally
  partyswap.totalLiquidityETH = partyswap.totalLiquidityETH.plus(
    trackedLiquidityETH
  );
  partyswap.totalLiquidityUSD = partyswap.totalLiquidityETH.times(
    bundle.ethPrice
  );

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  // save entities
  pair.save();
  partyswap.save();
  token0.save();
  token1.save();
}

export function handleMint(event: Mint): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString());
  let mints = transaction.mints;
  let mint = MintEvent.load(mints[mints.length - 1]);

  let pair = Pair.load(event.address.toHex());
  let partyswap = RytellFactory.load(FACTORY_ADDRESS);

  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);

  // update exchange info (except balances, sync will cover that)
  let token0Amount = convertTokenToDecimal(
    event.params.amount0,
    token0.decimals
  );
  let token1Amount = convertTokenToDecimal(
    event.params.amount1,
    token1.decimals
  );

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);

  // get new amounts of USD and ETH for tracking
  let bundle = Bundle.load("1");
  let amountTotalUSD = token1.derivedETH
    .times(token1Amount)
    .plus(token0.derivedETH.times(token0Amount))
    .times(bundle.ethPrice);

  // update txn counts
  pair.txCount = pair.txCount.plus(ONE_BI);
  partyswap.txCount = partyswap.txCount.plus(ONE_BI);

  // save entities
  token0.save();
  token1.save();
  pair.save();
  partyswap.save();

  mint.sender = event.params.sender;
  mint.amount0 = token0Amount as BigDecimal;
  mint.amount1 = token1Amount as BigDecimal;
  mint.logIndex = event.logIndex;
  mint.amountUSD = amountTotalUSD as BigDecimal;
  mint.save();

  // update the LP position
  let liquidityPosition = createLiquidityPosition(
    event.address,
    mint.to as Address
  );
  createLiquiditySnapshot(liquidityPosition, event);

  // update day entities
  updatePairDayData(event);
  updatePairHourData(event);
  updateRytellDayData(event);
  updateTokenDayData(token0 as Token, event);
  updateTokenDayData(token1 as Token, event);
}

export function handleBurn(event: Burn): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString());

  // safety check
  if (transaction === null) {
    return;
  }

  let burns = transaction.burns;
  let burn = BurnEvent.load(burns[burns.length - 1]);

  let pair = Pair.load(event.address.toHex());
  let partyswap = RytellFactory.load(FACTORY_ADDRESS);

  //update token info
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  let token0Amount = convertTokenToDecimal(
    event.params.amount0,
    token0.decimals
  );
  let token1Amount = convertTokenToDecimal(
    event.params.amount1,
    token1.decimals
  );

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);

  // get new amounts of USD and ETH for tracking
  let bundle = Bundle.load("1");
  let amountTotalUSD = token1.derivedETH
    .times(token1Amount)
    .plus(token0.derivedETH.times(token0Amount))
    .times(bundle.ethPrice);

  // update txn counts
  partyswap.txCount = partyswap.txCount.plus(ONE_BI);
  pair.txCount = pair.txCount.plus(ONE_BI);

  // update global counter and save
  token0.save();
  token1.save();
  pair.save();
  partyswap.save();

  // update burn
  // burn.sender = event.params.sender
  burn.amount0 = token0Amount as BigDecimal;
  burn.amount1 = token1Amount as BigDecimal;
  // burn.to = event.params.to
  burn.logIndex = event.logIndex;
  burn.amountUSD = amountTotalUSD as BigDecimal;
  burn.save();

  // update the LP position
  let liquidityPosition = createLiquidityPosition(
    event.address,
    burn.sender as Address
  );
  createLiquiditySnapshot(liquidityPosition, event);

  // update day entities
  updatePairDayData(event);
  updatePairHourData(event);
  updateRytellDayData(event);
  updateTokenDayData(token0 as Token, event);
  updateTokenDayData(token1 as Token, event);
}

export function handleSwap(event: Swap): void {
  // check if sender and dest are equal to the router
  // if so, change the to address to the tx issuer
  let dest: Address;
  if (
    event.params.sender == Address.fromString(ROUTER_ADDRESS) &&
    event.params.to == Address.fromString(ROUTER_ADDRESS)
  ) {
    dest = event.transaction.from;
  } else {
    dest = event.params.to;
  }

  let pair = Pair.load(event.address.toHexString());
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  let amount0In = convertTokenToDecimal(
    event.params.amount0In,
    token0.decimals
  );
  let amount1In = convertTokenToDecimal(
    event.params.amount1In,
    token1.decimals
  );
  let amount0Out = convertTokenToDecimal(
    event.params.amount0Out,
    token0.decimals
  );
  let amount1Out = convertTokenToDecimal(
    event.params.amount1Out,
    token1.decimals
  );

  // totals for volume updates
  let amount0Total = amount0Out.plus(amount0In);
  let amount1Total = amount1Out.plus(amount1In);

  // ETH/USD prices
  let bundle = Bundle.load("1");

  // get total amounts of derived USD and ETH for tracking
  let derivedAmountETH = token1.derivedETH
    .times(amount1Total)
    .plus(token0.derivedETH.times(amount0Total))
    .div(BigDecimal.fromString("2"));
  let derivedAmountUSD = derivedAmountETH.times(bundle.ethPrice);

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = getTrackedVolumeUSD(
    amount0Total,
    token0 as Token,
    amount1Total,
    token1 as Token,
    pair as Pair
  );

  let trackedAmountETH: BigDecimal;
  if (bundle.ethPrice.equals(ZERO_BD)) {
    trackedAmountETH = ZERO_BD;
  } else {
    trackedAmountETH = trackedAmountUSD.div(bundle.ethPrice);
  }

  // update token0 global volume and token liquidity stats
  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out));
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD);
  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD);

  // update token1 global volume and token liquidity stats
  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out));
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD);
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD);

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD);
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total);
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total);
  pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD);
  pair.txCount = pair.txCount.plus(ONE_BI);
  pair.save();

  // update global values, only used tracked amounts for volume
  let partyswap = RytellFactory.load(FACTORY_ADDRESS);
  partyswap.totalVolumeUSD = partyswap.totalVolumeUSD.plus(trackedAmountUSD);
  partyswap.totalVolumeETH = partyswap.totalVolumeETH.plus(trackedAmountETH);
  partyswap.untrackedVolumeUSD = partyswap.untrackedVolumeUSD.plus(
    derivedAmountUSD
  );
  partyswap.txCount = partyswap.txCount.plus(ONE_BI);

  // save entities
  pair.save();
  token0.save();
  token1.save();
  partyswap.save();

  let transaction = Transaction.load(event.transaction.hash.toHexString());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString());
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.mints = [];
    transaction.swaps = [];
    transaction.burns = [];
  }
  let swaps = transaction.swaps;
  let swap = new SwapEvent(
    event.transaction.hash
      .toHexString()
      .concat("-")
      .concat(BigInt.fromI32(swaps.length).toString())
  );

  // update swap event
  swap.transaction = transaction.id;
  swap.pair = pair.id;
  swap.timestamp = transaction.timestamp;
  swap.transaction = transaction.id;
  swap.sender = event.params.sender;
  swap.amount0In = amount0In;
  swap.amount1In = amount1In;
  swap.amount0Out = amount0Out;
  swap.amount1Out = amount1Out;
  swap.to = dest;
  swap.from = event.transaction.from;
  swap.logIndex = event.logIndex;
  // use the tracked amount if we have it
  swap.amountUSD =
    trackedAmountUSD === ZERO_BD ? derivedAmountUSD : trackedAmountUSD;
  swap.save();

  // update the transaction

  // TODO: Consider using .concat() for handling array updates to protect
  // against unintended side effects for other code paths.
  swaps.push(swap.id);
  transaction.swaps = swaps;
  transaction.save();

  // update day entities
  let pairDayData = updatePairDayData(event);
  let pairHourData = updatePairHourData(event);
  let partyswapDayData = updateRytellDayData(event);
  let token0DayData = updateTokenDayData(token0 as Token, event);
  let token1DayData = updateTokenDayData(token1 as Token, event);

  // swap specific updating
  partyswapDayData.dailyVolumeUSD = partyswapDayData.dailyVolumeUSD.plus(
    trackedAmountUSD
  );
  partyswapDayData.dailyVolumeETH = partyswapDayData.dailyVolumeETH.plus(
    trackedAmountETH
  );
  partyswapDayData.dailyVolumeUntracked = partyswapDayData.dailyVolumeUntracked.plus(
    derivedAmountUSD
  );
  partyswapDayData.save();

  // swap specific updating for pair
  pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(
    amount0Total
  );
  pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(
    amount1Total
  );
  pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(
    trackedAmountUSD
  );
  pairDayData.save();

  // update hourly pair data
  pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
    amount0Total
  );
  pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
    amount1Total
  );
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(
    trackedAmountUSD
  );
  pairHourData.save();

  // swap specific updating for token0
  token0DayData.dailyVolumeToken = token0DayData.dailyVolumeToken.plus(
    amount0Total
  );
  token0DayData.dailyVolumeETH = token0DayData.dailyVolumeETH.plus(
    amount0Total.times(token1.derivedETH as BigDecimal)
  );
  token0DayData.dailyVolumeUSD = token0DayData.dailyVolumeUSD.plus(
    amount0Total.times(token0.derivedETH as BigDecimal).times(bundle.ethPrice)
  );
  token0DayData.save();

  // swap specific updating
  token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(
    amount1Total
  );
  token1DayData.dailyVolumeETH = token1DayData.dailyVolumeETH.plus(
    amount1Total.times(token1.derivedETH as BigDecimal)
  );
  token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(
    amount1Total.times(token1.derivedETH as BigDecimal).times(bundle.ethPrice)
  );
  token1DayData.save();
}
