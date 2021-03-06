# Rytell Subgraph

A subgraph index for Rytell -- Rytell is a Decentralized Exchange (DEX) launched in Avalanche where you can do permissionless swaps between currencies, earn interests in farms and liquidity pools in one interoperable, highly scalable ecosystem.

This subgraph dynamically tracks any pair created by the Rytell factory. It tracks the current state of Rytell contracts, and contains derived stats for things like historical data.

- aggregated data across pairs and tokens,
- data on individual pairs and tokens,
- data on transactions
- data on liquidity providers
- historical data on Rytell, pairs or tokens, aggregated by day

## Running Locally

Make sure to update package.json settings to point to your own graph account.

## Queries

Below are a few ways to show how to query the Rytell subgraph for data. The queries show most of the information that is queryable, but there are many other filtering options that can be used, just check out the [querying api](https://thegraph.com/docs/graphql-api). 

## Key Entity Overviews

#### RytellFactory

Contains data across all of Rytell. This entity tracks important things like total liquidity, all time volume, transaction count, number of pairs and more.

#### Token

Contains data on a specific token. This token specific data is aggregated across all pairs, and is updated whenever there is a transaction involving that token.

#### Pair

Contains data on a specific pair.

#### Transaction

Every transaction on Rytell is stored. Each transaction contains an array of mints, burns, and swaps that occured within it.

#### Mint, Burn, Swap

These contain specifc information about a transaction. Things like which pair triggered the transaction, amounts, sender, recipient, and more. Each is linked to a parent Transaction entity.

## Example Queries

### Querying Aggregated Rytell Data

This query fetches aggredated data from all Rytell pairs and tokens, to give a view into how much activity is happening within the whole protocol.

```graphql
{
  rytellFactories(first: 1) {
    pairCount
    totalVolumeUSD
    totalLiquidityUSD
  }
}
```
