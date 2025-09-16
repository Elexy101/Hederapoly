# HederaPoly

HederaPoly is a blockchain-based game built on Solidity, inspired by Monopoly. Players mint 100 HPOLY tokens (ERC1155) and start with a 100-token in-game balance. They navigate a 12-tile board by rolling a virtual die, landing on profit (+80 to +160 tokens) or loss (-50 to -120 tokens) tiles. Players burn tokens (1000 initially) to mint unique NFTs, with a cap of 6000 NFTs and 12M tokens. The game ends if the balance hits zero or caps are reached. It features strategic resource management, a pseudorandom number generator, and owner controls for token caps.

## GAME PREVIEW
<img width="1920" height="969" alt="Screenshot from 2025-09-16 11-45-15" src="https://github.com/user-attachments/assets/1c2b7d87-9c6a-4232-9248-ce01ad93ed2f" />


## DEPLOYMENT ID
CONTRACT ID: 0.0.6836339

CONTRACT ADDRESS: 0x8F1e1DC747D66EA0958e271d7EFe1503a77c719E

<img width="1920" height="969" alt="Screenshot from 2025-09-16 11-44-28" src="https://github.com/user-attachments/assets/3f1203d8-bb53-4a96-8d20-a691b1cefce4" />


## HOW TO PLAY THE GAME
- Must have Hedera testnet faucet, you can get it @ [faucet](https://portal.hedera.com/faucet)
- Must have either an OKX/Metamask wallet, you can get OKX wallet @[OKX](https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge) or Metamask wallet @[Metamask](https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en)
- create a new wallet and backup recovery phrase
- then you go to chainlink to add the [Hedera netwok](https://chainlist.org/?search=hedera&testnets=true)
- Your testnet balance will reflect. Have fun playing :)

## Features

- **ERC1155 Tokens**: HPOLY tokens and unique NFTs for rewards.
- **Gameplay**: Move across a 12-tile board with profit, loss, and neutral tiles.
- **NFT Minting**: Burn 1000+ HPOLY tokens to mint NFTs.
- **Caps**: 12M token supply and 6000 NFT limits.
- **Randomization**: Uses a PRNG contract for dice rolls, with a fallback mechanism.
- **Owner Controls**: Adjust token caps and manage game state.

## Getting Started

1. Deploy the contract on a compatible blockchain.
2. Mint initial 100 HPOLY tokens using `mintTokens()`.
3. Start the game with `startGame()`.
4. Roll the die with `rollDice()` and mint NFTs with `mintNFT()`.

## Requirements

- Solidity ^0.8.20
- OpenZeppelin Contracts (ERC1155, Ownable)
- PRNG contract at `0x000...0169`

## VIDEO PREVIEW
Youtube: https://youtu.be/tuR7wzhrbqI
