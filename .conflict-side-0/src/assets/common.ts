export enum ASSET_TYPE {
  Fiat = "fiat",
  Crypto = "crypto",
  Digital = "digital"
}

export enum ASSET_NETWORK {
  Bitcoin = "bitcoin",
  Ethereum = "ethereum",
  Ripple = "ripple",
  Litecoin = "litecoin",
  BitcoinCash = "bitcoincash",
  Stellar = "stellar",
  Kadena = "kadena",
  Tezos = "tezos",
  Flux = "flux",
  Hathor = "hathor",
  Thought = "thought",
  SEPA = "sepa",
  SWIFT = "swift",
  Praxis = "praxis",
  UKFaster = "ukfaster",
  ACH = "ach",
  DomesticWire = "domesticwire",
  InternationalWire = "internationalwire",
  Fedwire = "fedwire",
  Polygon = "polygon",
  Arbitrum = "arbitrum",
  Optimism = "optimism",
  Terra = "terra",
  Cardano = "cardano",
  PolkaDot = "polkadot",
  Hedera = "hedera",
  Algorand = "algorand",
  Avalanche = "avalanche",
  Kusama = "kusama",
  Near = "near",
  Celo = "celo",
  Cosmos = "cosmos",
  Dogecoin = "dogecoin",
  Solana = "solana",
  Aptos = "aptos",
  Celestia = "celestia",
  OctaSpace = "octaspace",
  Alephium = "alephium"
}

export interface AssetNetwork {
  type: ASSET_NETWORK;
  isAlternative?: boolean;
}

export interface AssetConfigBase<T extends string = string> {
  symbol: T;
  name: string;
  type: ASSET_TYPE;
  icon: string;
  /**
   * Theme-specific colors for light and dark modes.
   * Light mode colors are optimized for accessibility on light backgrounds.
   */
  theme: {
    light: string;
    dark: string;
  };
  decimalPlaces: number;
  multiplier: number;
  networks: ReadonlyArray<AssetNetwork>;
  collateral?: boolean;
  tram?: boolean;
  placeholder?: boolean;
} 