import { Address } from "@graphprotocol/graph-ts";
import { StakingPoolPosition } from "../types/schema";
import { ZERO_BD } from "./helpers";

export function createStakingPoolPosition(
  stakingPool: Address,
  user: Address
): StakingPoolPosition {
  let id = stakingPool
    .toHexString()
    .concat("-")
    .concat(user.toHexString());
  let stakingPoolPosition = StakingPoolPosition.load(id);
  if (stakingPoolPosition === null) {
    stakingPoolPosition = new StakingPoolPosition(id);
    stakingPoolPosition.user = user.toHexString();
    stakingPoolPosition.stakingPool = stakingPool.toHexString();
    stakingPoolPosition.stakingPoolTokenBalance = ZERO_BD;
    stakingPoolPosition.save();
  }
  return stakingPoolPosition as StakingPoolPosition;
}
