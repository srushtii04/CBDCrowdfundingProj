# Tokenomics

`CFT` has 18 decimals and no fixed initial supply. Minting is restricted to the
deployed crowdfunding contract, configured once by the token owner. A
successful campaign contributor can claim `1000 CFT` per contributed ETH,
represented exactly as `contributionWei * 1000`.

Failed campaigns mint no CFT. The owner can burn tokens through the standard
ERC-20 burn interface. RWD is a separate reward token used by `StakingFarm`;
it must be funded before rewards can be claimed. AMM LP tokens represent pool
shares and are not CFT.

Governance voting power is delegated CFT voting power at the proposal snapshot
block. Token transfers after the snapshot do not change that proposal's vote.
