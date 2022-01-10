import { Address } from "@graphprotocol/graph-ts";
import { Transfer } from "../types/Jacuzzi/Jacuzzi";
import { Transfer as PartyTokenTransfer } from "../types/PartyToken/PartyToken";
import { Jacuzzi, JacuzziInteraction } from "../types/schema";
import {
  ADDRESS_ZERO,
  BI_18,
  convertTokenToDecimal,
  createUser,
  JACUZZI_ADDRESS,
  ONE_BI,
  ZERO_BD,
  ZERO_BI,
} from "./helpers";
import { createJacuzziPosition } from "./jacuzzi-helpers";

export function handleTransfer(event: Transfer): void {
  let jacuzzi = Jacuzzi.load(JACUZZI_ADDRESS);
  if (jacuzzi === null) {
    jacuzzi = new Jacuzzi(JACUZZI_ADDRESS);
    jacuzzi.totalInjected = ZERO_BD;
    jacuzzi.totalStaked = ZERO_BD;
    jacuzzi.totalSupply = ZERO_BD;
    jacuzzi.txCount = ZERO_BI;
    jacuzzi.txCountFromParty = ZERO_BI;
  }
  jacuzzi.txCount = jacuzzi.txCount.plus(ONE_BI);

  // user stats
  let from = event.params.from;
  createUser(from);
  let to = event.params.to;
  createUser(to);
  let value = convertTokenToDecimal(event.params.value, BI_18);

  let interactionHash = event.transaction.hash.toHexString();
  let jacuzziInteraction = JacuzziInteraction.load(interactionHash);
  if (jacuzziInteraction === null) {
    jacuzziInteraction = new JacuzziInteraction(interactionHash);
    jacuzziInteraction.jacuzzi = JACUZZI_ADDRESS;
    jacuzziInteraction.user = ADDRESS_ZERO;
    jacuzziInteraction.jacuzziPosition = ADDRESS_ZERO;
    jacuzziInteraction.blockNumber = event.block.number;
    jacuzziInteraction.timestamp = event.block.timestamp;
    jacuzziInteraction.amountStaked = ZERO_BD;
    jacuzziInteraction.amountRetired = ZERO_BD;
    jacuzziInteraction.jacuzziTokenMinted = ZERO_BD;
    jacuzziInteraction.jacuzziTokenBurned = ZERO_BD;
    jacuzziInteraction.save();
  }

  // Enters jacuzzi - Mints xParty
  if (from.toHexString() == ADDRESS_ZERO) {
    let jacuzziPosition = createJacuzziPosition(event.address, to);
    jacuzziPosition.jacuzziTokenBalance = jacuzziPosition.jacuzziTokenBalance.plus(
      value
    );
    jacuzziPosition.save();

    jacuzzi.totalSupply = jacuzzi.totalSupply.plus(value);
    jacuzziInteraction.jacuzziTokenMinted = value;
    jacuzziInteraction.user = to.toHexString();
    jacuzziInteraction.jacuzziPosition = jacuzziPosition.id;
  }

  /// Leaves jacuzzi - Burns xParty
  if (to.toHexString() == ADDRESS_ZERO) {
    let jacuzziPosition = createJacuzziPosition(event.address, from);
    jacuzziPosition.jacuzziTokenBalance = jacuzziPosition.jacuzziTokenBalance.minus(
      value
    );
    jacuzziPosition.save();

    jacuzzi.totalSupply = jacuzzi.totalSupply.minus(value);
    jacuzziInteraction.jacuzziTokenBurned = value;
    jacuzziInteraction.user = from.toHexString();
    jacuzziInteraction.jacuzziPosition = jacuzziPosition.id;
  }

  jacuzziInteraction.save();
  jacuzzi.save();
  return;
}

export function handleTokenTransfer(event: PartyTokenTransfer): void {
  // user stats
  let from = event.params.from;
  let to = event.params.to;

  if (
    from.toHexString() != JACUZZI_ADDRESS &&
    to.toHexString() != JACUZZI_ADDRESS
  ) {
    return;
  }

  createUser(from);
  createUser(to);
  let value = convertTokenToDecimal(event.params.value, BI_18);

  let jacuzzi = Jacuzzi.load(JACUZZI_ADDRESS);
  if (jacuzzi === null) {
    jacuzzi = new Jacuzzi(JACUZZI_ADDRESS);
    jacuzzi.totalInjected = ZERO_BD;
    jacuzzi.totalStaked = ZERO_BD;
    jacuzzi.totalSupply = ZERO_BD;
    jacuzzi.txCount = ZERO_BI;
    jacuzzi.txCountFromParty = ZERO_BI;
  }
  jacuzzi.txCountFromParty = jacuzzi.txCountFromParty.plus(ONE_BI);

  let interactionHash = event.transaction.hash.toHexString();
  let jacuzziInteraction = JacuzziInteraction.load(interactionHash);
  if (jacuzziInteraction === null) {
    jacuzziInteraction = new JacuzziInteraction(interactionHash);
    jacuzziInteraction.jacuzzi = JACUZZI_ADDRESS;
    jacuzziInteraction.user = ADDRESS_ZERO;
    jacuzziInteraction.jacuzziPosition = ADDRESS_ZERO;
    jacuzziInteraction.blockNumber = event.block.number;
    jacuzziInteraction.timestamp = event.block.timestamp;
    jacuzziInteraction.amountStaked = ZERO_BD;
    jacuzziInteraction.amountRetired = ZERO_BD;
    jacuzziInteraction.jacuzziTokenMinted = ZERO_BD;
    jacuzziInteraction.jacuzziTokenBurned = ZERO_BD;
    jacuzziInteraction.save();
  }

  if (from.toHexString() != JACUZZI_ADDRESS) {
    let jacuzziPosition = createJacuzziPosition(
      Address.fromString(JACUZZI_ADDRESS),
      to
    );

    jacuzzi.totalStaked = jacuzzi.totalStaked.plus(value);
    jacuzziInteraction.amountStaked = value;
    jacuzziInteraction.user = to.toHexString();
    jacuzziInteraction.jacuzziPosition = jacuzziPosition.id;
  }

  if (to.toHexString() != JACUZZI_ADDRESS) {
    let jacuzziPosition = createJacuzziPosition(
      Address.fromString(JACUZZI_ADDRESS),
      from
    );

    jacuzzi.totalStaked = jacuzzi.totalStaked.minus(value);
    jacuzziInteraction.amountRetired = value;
    jacuzziInteraction.user = from.toHexString();
    jacuzziInteraction.jacuzziPosition = jacuzziPosition.id;
  }

  jacuzziInteraction.save();
  jacuzzi.save();
  return;
}
