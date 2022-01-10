import { Address } from "@graphprotocol/graph-ts";
import { JacuzziPosition } from "../types/schema";
import { ZERO_BD } from "./helpers";

export function createJacuzziPosition(
  jacuzzi: Address,
  user: Address
): JacuzziPosition {
  let id = jacuzzi
    .toHexString()
    .concat("-")
    .concat(user.toHexString());
  let jacuzziPosition = JacuzziPosition.load(id);
  if (jacuzziPosition === null) {
    jacuzziPosition = new JacuzziPosition(id);
    jacuzziPosition.user = user.toHexString();
    jacuzziPosition.jacuzzi = jacuzzi.toHexString();
    jacuzziPosition.jacuzziTokenBalance = ZERO_BD;
    jacuzziPosition.save();
  }
  return jacuzziPosition as JacuzziPosition;
}
