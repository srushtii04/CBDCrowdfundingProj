import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("DEX Pair, Factory and Router", function () {
  async function deployDex() {
    const [owner, trader, other] = await ethers.getSigners();
    const tokenA = await ethers.deployContract("DemoERC20", ["Token A", "A", 1_000_000]);
    const tokenB = await ethers.deployContract("DemoERC20", ["Token B", "B", 1_000_000]);
    const tokenC = await ethers.deployContract("DemoERC20", ["Token C", "C", 1_000_000]);
    const factory = await ethers.deployContract("DexFactory");
    const router = await ethers.deployContract("DexRouter", [factory]);
    return { owner, trader, other, tokenA, tokenB, tokenC, factory, router };
  }

  async function createPair(factory: any, tokenA: any, tokenB: any) {
    await factory.createPair(tokenA, tokenB);
    return ethers.getContractAt("DexPair", await factory.getPair(tokenA, tokenB));
  }

  async function seedPair(
    pair: any,
    tokenA: any,
    tokenB: any,
    amountA: bigint,
    amountB: bigint,
    owner: any,
  ) {
    await tokenA.transfer(pair, amountA);
    await tokenB.transfer(pair, amountB);
    await pair.mint(owner);
  }

  it("creates a pair and emits PairCreated", async function () {
    const { tokenA, tokenB, factory } = await deployDex();

    await expect(factory.createPair(tokenA, tokenB))
      .to.emit(factory, "PairCreated");

    const pairAddress = await factory.getPair(tokenA, tokenB);
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    expect(await factory.allPairs(0)).to.equal(pairAddress);
    await expect(factory.createPair(tokenA, tokenB)).to.be.revertedWith("PAIR_EXISTS");
  });

  it("mints first liquidity, locks 1000 LP, and emits Mint/Sync", async function () {
    const { owner, tokenA, tokenB, factory } = await deployDex();
    const pair = await createPair(factory, tokenA, tokenB);

    await tokenA.transfer(pair, 1000n);
    await tokenB.transfer(pair, 4000n);
    await expect(pair.mint(owner))
      .to.emit(pair, "Mint")
      .and.to.emit(pair, "Sync");

    expect(await pair.balanceOf(owner)).to.equal(1000n);
    expect(await pair.balanceOf(await pair.LOCKED_LIQUIDITY())).to.equal(1000n);
    expect(await pair.totalSupply()).to.equal(2000n);
    expect(await pair.getReserves()).to.deep.equal([1000n, 4000n]);
  });

  it("applies the 0.3% fee and preserves the invariant on a direct swap", async function () {
    const { owner, trader, tokenA, tokenB, factory } = await deployDex();
    const pair = await createPair(factory, tokenA, tokenB);
    await seedPair(pair, tokenA, tokenB, 1000n, 2000n, owner);

    await tokenA.transfer(pair, 100n);
    await expect(pair.connect(trader).swap(0n, 181n, trader))
      .to.emit(pair, "Swap")
      .and.to.emit(pair, "Sync");

    expect(await pair.getReserves()).to.deep.equal([1100n, 1819n]);
  });

  it("rejects excessive output and swaps without input", async function () {
    const { owner, trader, tokenA, tokenB, factory } = await deployDex();
    const pair = await createPair(factory, tokenA, tokenB);
    await seedPair(pair, tokenA, tokenB, 1000n, 2000n, owner);

    await tokenA.transfer(pair, 100n);
    await expect(pair.swap(0n, 182n, trader)).to.be.revertedWith("K");

    const tokenD = await ethers.deployContract("DemoERC20", ["Token D", "D", 1_000_000]);
    const tokenE = await ethers.deployContract("DemoERC20", ["Token E", "E", 1_000_000]);
    const freshPair = await createPair(factory, tokenD, tokenE);
    await seedPair(freshPair, tokenD, tokenE, 1000n, 2000n, owner);
    await expect(freshPair.swap(0n, 181n, trader)).to.be.revertedWith(
      "INSUFFICIENT_INPUT_AMOUNT",
    );
  });

  it("supports router slippage, deadlines, allowance checks, and proportional liquidity", async function () {
    const { owner, trader, tokenA, tokenB, factory, router } = await deployDex();
    const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;

    await tokenA.approve(router, 1000n);
    await tokenB.approve(router, 4000n);
    await router.addLiquidity(
      tokenA,
      tokenB,
      1000n,
      4000n,
      1000n,
      4000n,
      owner,
      deadline,
    );
    const pair = await ethers.getContractAt(
      "DexPair",
      await factory.getPair(tokenA, tokenB),
    );

    await tokenA.transfer(trader, 300n);
    await tokenA.connect(trader).approve(router, 100n);
    const path = [tokenA.target, tokenB.target];
    await expect(
      router.connect(trader).swapExactTokensForTokens(
        200n,
        1n,
        path,
        trader,
        deadline,
      ),
    ).to.be.revertedWithCustomError(tokenA, "ERC20InsufficientAllowance");

    const quote = await router.getAmountsOut(100n, path);
    await tokenA.connect(trader).approve(router, 100n);
    await expect(
      router.connect(trader).swapExactTokensForTokens(
        100n,
        quote[1] + 1n,
        path,
        trader,
        deadline,
      ),
    ).to.be.revertedWithCustomError(router, "InsufficientOutput");

    await expect(
      router.connect(trader).swapExactTokensForTokens(
        1n,
        0n,
        path,
        trader,
        BigInt((await ethers.provider.getBlock("latest"))!.timestamp) - 1n,
      ),
    ).to.be.revertedWith("EXPIRED");

    await tokenA.connect(trader).approve(router, 300n);
    await router.connect(trader).swapExactTokensForTokens(
      100n,
      quote[1],
      path,
      trader,
      deadline,
    );

    const lpBalance = await pair.balanceOf(owner);
    await pair.approve(router, lpBalance / 2n);
    const reservesBefore = await pair.getReserves();
    await expect(
      router.removeLiquidity(
        tokenA,
        tokenB,
        lpBalance / 2n,
        1n,
        1n,
        owner,
        deadline,
      ),
    ).to.emit(pair, "Burn");
    const reservesAfter = await pair.getReserves();
    expect(reservesAfter[0]).to.be.lessThan(reservesBefore[0]);
    expect(reservesAfter[1]).to.be.lessThan(reservesBefore[1]);
  });

  it("uses the limiting side for a wrong-ratio liquidity request", async function () {
    const { owner, tokenA, tokenB, factory, router } = await deployDex();
    const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    await tokenA.approve(router, 1500n);
    await tokenB.approve(router, 7000n);

    await router.addLiquidity(
      tokenA,
      tokenB,
      1000n,
      4000n,
      1000n,
      4000n,
      owner,
      deadline,
    );
    const pair = await ethers.getContractAt(
      "DexPair",
      await factory.getPair(tokenA, tokenB),
    );
    const lpBefore = await pair.balanceOf(owner);

    await router.addLiquidity(
      tokenA,
      tokenB,
      500n,
      3000n,
      500n,
      2000n,
      owner,
      deadline,
    );

    expect(await pair.balanceOf(owner)).to.equal(lpBefore + 1000n);
    expect(await router.getReserves(tokenA, tokenB)).to.deep.equal([1500n, 6000n]);
  });

  it("routes a two-pool multi-hop swap", async function () {
    const { owner, trader, tokenA, tokenB, tokenC, factory, router } = await deployDex();
    const pairAB = await createPair(factory, tokenA, tokenB);
    const pairBC = await createPair(factory, tokenB, tokenC);
    await seedPair(pairAB, tokenA, tokenB, 1000n, 2000n, owner);
    await seedPair(pairBC, tokenB, tokenC, 4000n, 500n, owner);

    await tokenA.transfer(trader, 100n);
    await tokenA.connect(trader).approve(router, 100n);
    const amounts = await router.getAmountsOut(100n, [tokenA, tokenB, tokenC]);
    expect(amounts[1]).to.equal(181n);
    expect(amounts[2]).to.equal(21n);
    await router.connect(trader).swapExactTokensForTokens(
      100n,
      21n,
      [tokenA, tokenB, tokenC],
      trader,
      (await ethers.provider.getBlock("latest"))!.timestamp + 3600,
    );
    expect(await router.getReserves(tokenA, tokenB)).to.deep.equal([1100n, 1819n]);
    expect(await router.getReserves(tokenB, tokenC)).to.deep.equal([4181n, 479n]);
  });
});
