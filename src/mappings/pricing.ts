/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from "../types/schema";
import { BigDecimal, Address, BigInt } from "@graphprotocol/graph-ts/index";
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from "./helpers";

const WAVAX_ADDRESS = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7";
// const USDT_WAVAX_PAIR = "0x961b356b0a7fb534430640f07740ac10eeec8b44"; // created block 2,884,714
const DAI_WAVAX_PAIR = ""; // created block 2,884,712
const USDC_WAVAX_PAIR = "0xe8440c62c6c01e7c47cbedfca80ab26be0af79db";

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let daiPair = Pair.load(DAI_WAVAX_PAIR); // dai is token1
  let usdcPair = Pair.load(USDC_WAVAX_PAIR); // usdt is token1
  let zero = BigDecimal.fromString("0");
  let totalLiquidityWAVAX = zero;

  if (daiPair !== null && usdcPair !== null) {
    // DAI and USDT have been created
    totalLiquidityWAVAX = daiPair.reserve0.plus(usdcPair.reserve0);
  }

  if (totalLiquidityWAVAX.notEqual(zero)) {
    let daiWeight = daiPair.reserve0.div(totalLiquidityWAVAX);
    let usdtWeight = usdcPair.reserve0.div(totalLiquidityWAVAX);
    return daiPair.token1Price
      .times(daiWeight)
      .plus(usdcPair.token1Price.times(usdtWeight));
  } else if (usdcPair !== null) {
    // only USDT has been created
    return usdcPair.token1Price;
  } else {
    // none have been created
    return ONE_BD; // hack, REMOVE!
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  WAVAX_ADDRESS, // WAVAX
  "0x69a61f38df59cbb51962e69c54d39184e21c27ec", // party
  "0xd586e7f844cea2f87f50152665bcbc2c279d8d70", // dai.e
  "0xc7198437980c041c805a1edcba50c1ce5db95118", // usdt.e
  "0x50b7545627a5162f82a992c33b87adc75187b218", // wbtc.e
  "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab", // weth.e
  "0x5947bb275c521040051d82396192181b413227a3", // link.e
  "0xc931f61b1534eb21d8c11b24f3f5ab2471d4ab50", // aablock
  "0x6e7f5c0b9f4432716bdd0a77a3601291b9d9e985", // spore
  "0xa1144a6a1304bd9cbb16c800f7a867508726566e", // bag
  "0x60781c2586d68229fde47564546784ab3faca982", // png
  "0xe896cdeaac9615145c0ca09c8cd5c25bced6384c", // pefi
  "0xbb69c92fbb4f1aff528875056650c862f94d3cc1", // frax
  "0xc38f41a296a4493ff429f1238e030924a1542e50", // snob
  "0xe1c8f3d529bea8e3fa1fac5b416335a2f998ee1c", // again
  "0xd1c3f94de7e5b45fa4edbba472491a9f4b166fc4", // xava
  "0x1ecd47ff4d9598f89721a2866bfeb99505a413ed", // avme
  "0xce829a89d4a55a63418bcc43f00145adef0edb8e", // rendoge
  "0xa5e59761ebd4436fa4d20e1a27cba29fb2471fc6", // sherpa
  "0x59414b3089ce2af0010e7523dea7e2b35d776ec7", // yak
  "0x8729438eb15e2c8b576fcc6aecda6a148776c0f5", // qi
];

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
// let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString("10");
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString("0");

// minimum liquidity for price to get tracked
// let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString("1");
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString("0");

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WAVAX_ADDRESS) {
    return ONE_BD;
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(
      Address.fromString(token.id),
      Address.fromString(WHITELIST[i])
    );
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString());
      // CONDITIONAL INCLUDINT THRESHOLD
      // if (
      //   pair.token0 == token.id &&
      //   pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)
      // ) {
      if (pair.token0 == token.id) {
        let token1 = Token.load(pair.token1);
        return pair.token1Price.times(token1.derivedETH as BigDecimal); // return token1 per our token * Eth per token 1
      }
      // CONDITIONAL INCLUDINT THRESHOLD
      // if (
      //   pair.token1 == token.id &&
      //   pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)
      // ) {
      if (pair.token1 == token.id) {
        let token0 = Token.load(pair.token0);
        return pair.token0Price.times(token0.derivedETH as BigDecimal); // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD; // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load("1");
  let price0 = token0.derivedETH.times(bundle.ethPrice);
  let price1 = token1.derivedETH.times(bundle.ethPrice);

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = pair.reserve0.times(price0);
    let reserve1USD = pair.reserve1.times(price1);
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD;
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (
        reserve0USD
          .times(BigDecimal.fromString("2"))
          .lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)
      ) {
        return ZERO_BD;
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (
        reserve1USD
          .times(BigDecimal.fromString("2"))
          .lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)
      ) {
        return ZERO_BD;
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString("2"));
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0);
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1);
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load("1");
  let price0 = token0.derivedETH.times(bundle.ethPrice);
  let price1 = token1.derivedETH.times(bundle.ethPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString("2"));
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}
