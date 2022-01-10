import { Address } from "@graphprotocol/graph-ts";
import { Transfer } from "../types/StakingPool/StakingPool";
import { Transfer as RadiTransfer } from "../types/Radi/Radi";
import { StakingPool, StakingPoolInteraction } from "../types/schema";
import {
  ADDRESS_ZERO,
  BI_18,
  convertTokenToDecimal,
  createUser,
  STAKING_POOL_ADDRESS,
  ONE_BI,
  ZERO_BD,
  ZERO_BI,
} from "./helpers";
import { createStakingPoolPosition } from "./staking-pool-helpers";

export function handleTransfer(event: Transfer): void {
  let stakingPool = StakingPool.load(STAKING_POOL_ADDRESS);
  if (stakingPool === null) {
    stakingPool = new StakingPool(STAKING_POOL_ADDRESS);
    stakingPool.totalInjected = ZERO_BD;
    stakingPool.totalStaked = ZERO_BD;
    stakingPool.totalSupply = ZERO_BD;
    stakingPool.txCount = ZERO_BI;
    stakingPool.txCountFromParty = ZERO_BI;
  }
  stakingPool.txCount = stakingPool.txCount.plus(ONE_BI);

  // user stats
  let from = event.params.from;
  createUser(from);
  let to = event.params.to;
  createUser(to);
  let value = convertTokenToDecimal(event.params.value, BI_18);

  let interactionHash = event.transaction.hash.toHexString();
  let stakingPoolInteraction = StakingPoolInteraction.load(interactionHash);
  if (stakingPoolInteraction === null) {
    stakingPoolInteraction = new StakingPoolInteraction(interactionHash);
    stakingPoolInteraction.stakingPool = STAKING_POOL_ADDRESS;
    stakingPoolInteraction.user = ADDRESS_ZERO;
    stakingPoolInteraction.stakingPoolPosition = ADDRESS_ZERO;
    stakingPoolInteraction.blockNumber = event.block.number;
    stakingPoolInteraction.timestamp = event.block.timestamp;
    stakingPoolInteraction.amountStaked = ZERO_BD;
    stakingPoolInteraction.amountRetired = ZERO_BD;
    stakingPoolInteraction.stakingPoolTokenMinted = ZERO_BD;
    stakingPoolInteraction.stakingPoolTokenBurned = ZERO_BD;
    stakingPoolInteraction.save();
  }

  // Enters stakingPool - Mints xParty
  if (from.toHexString() == ADDRESS_ZERO) {
    let stakingPoolPosition = createStakingPoolPosition(event.address, to);
    stakingPoolPosition.stakingPoolTokenBalance = stakingPoolPosition.stakingPoolTokenBalance.plus(
      value
    );
    stakingPoolPosition.save();

    stakingPool.totalSupply = stakingPool.totalSupply.plus(value);
    stakingPoolInteraction.stakingPoolTokenMinted = value;
    stakingPoolInteraction.user = to.toHexString();
    stakingPoolInteraction.stakingPoolPosition = stakingPoolPosition.id;
  }

  /// Leaves stakingPool - Burns xParty
  if (to.toHexString() == ADDRESS_ZERO) {
    let stakingPoolPosition = createStakingPoolPosition(event.address, from);
    stakingPoolPosition.stakingPoolTokenBalance = stakingPoolPosition.stakingPoolTokenBalance.minus(
      value
    );
    stakingPoolPosition.save();

    stakingPool.totalSupply = stakingPool.totalSupply.minus(value);
    stakingPoolInteraction.stakingPoolTokenBurned = value;
    stakingPoolInteraction.user = from.toHexString();
    stakingPoolInteraction.stakingPoolPosition = stakingPoolPosition.id;
  }

  stakingPoolInteraction.save();
  stakingPool.save();
  return;
}

export function handleTokenTransfer(event: RadiTransfer): void {
  // user stats
  let from = event.params.from;
  let to = event.params.to;

  if (
    from.toHexString() != STAKING_POOL_ADDRESS &&
    to.toHexString() != STAKING_POOL_ADDRESS
  ) {
    return;
  }

  createUser(from);
  createUser(to);
  let value = convertTokenToDecimal(event.params.value, BI_18);

  let stakingPool = StakingPool.load(STAKING_POOL_ADDRESS);
  if (stakingPool === null) {
    stakingPool = new StakingPool(STAKING_POOL_ADDRESS);
    stakingPool.totalInjected = ZERO_BD;
    stakingPool.totalStaked = ZERO_BD;
    stakingPool.totalSupply = ZERO_BD;
    stakingPool.txCount = ZERO_BI;
    stakingPool.txCountFromParty = ZERO_BI;
  }
  stakingPool.txCountFromParty = stakingPool.txCountFromParty.plus(ONE_BI);

  let interactionHash = event.transaction.hash.toHexString();
  let stakingPoolInteraction = StakingPoolInteraction.load(interactionHash);
  if (stakingPoolInteraction === null) {
    stakingPoolInteraction = new StakingPoolInteraction(interactionHash);
    stakingPoolInteraction.stakingPool = STAKING_POOL_ADDRESS;
    stakingPoolInteraction.user = ADDRESS_ZERO;
    stakingPoolInteraction.stakingPoolPosition = ADDRESS_ZERO;
    stakingPoolInteraction.blockNumber = event.block.number;
    stakingPoolInteraction.timestamp = event.block.timestamp;
    stakingPoolInteraction.amountStaked = ZERO_BD;
    stakingPoolInteraction.amountRetired = ZERO_BD;
    stakingPoolInteraction.stakingPoolTokenMinted = ZERO_BD;
    stakingPoolInteraction.stakingPoolTokenBurned = ZERO_BD;
    stakingPoolInteraction.save();
  }

  if (from.toHexString() != STAKING_POOL_ADDRESS) {
    let stakingPoolPosition = createStakingPoolPosition(
      Address.fromString(STAKING_POOL_ADDRESS),
      to
    );

    stakingPool.totalStaked = stakingPool.totalStaked.plus(value);
    stakingPoolInteraction.amountStaked = value;
    stakingPoolInteraction.user = to.toHexString();
    stakingPoolInteraction.stakingPoolPosition = stakingPoolPosition.id;
  }

  if (to.toHexString() != STAKING_POOL_ADDRESS) {
    let stakingPoolPosition = createStakingPoolPosition(
      Address.fromString(STAKING_POOL_ADDRESS),
      from
    );

    stakingPool.totalStaked = stakingPool.totalStaked.minus(value);
    stakingPoolInteraction.amountRetired = value;
    stakingPoolInteraction.user = from.toHexString();
    stakingPoolInteraction.stakingPoolPosition = stakingPoolPosition.id;
  }

  stakingPoolInteraction.save();
  stakingPool.save();
  return;
}
