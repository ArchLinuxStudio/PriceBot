const { ethers } = require('ethers');
const {
  abi: IUniswapV3PoolABI,
} = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const {
  abi: QuoterABI,
} = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');

const { getAbi, getPoolImmutables } = require('./helpers');

require('dotenv').config();
const ARBITRUM_PROVIDER_URL = process.env.ARBITRUM_PROVIDER_URL;

const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_PROVIDER_URL);

// WBTC/ETH, 0.05% return with fee 500, get in info.uniswap.org
const poolAddress = '0x2f5e87c9312fa29aed5c179e456625d79015299c';

// https://docs.uniswap.org/protocol/reference/deployments
const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

const getPrice = async (inputAmount) => {
  // init poolContract
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );
  //WBTC
  const tokenAddress0 = await poolContract.token0();
  //ETH
  const tokenAddress1 = await poolContract.token1();

  //get abi first, so we can init contract next
  const tokenAbi0 = await getAbi(tokenAddress0);
  const tokenAbi1 = await getAbi(tokenAddress1);

  const tokenContract0 = new ethers.Contract(
    tokenAddress0,
    tokenAbi0,
    provider
  );
  const tokenContract1 = new ethers.Contract(
    tokenAddress1,
    tokenAbi1,
    provider
  );

  //I found the problem for anyone else using a different pool address. I was using the WETH/USDC pool but the USDC side was using a proxy contract and didn't have the decimals and symbols functions in the main contract. Setting these values manually made the whole thing work.Just look at the respective addresses in the pool and make sure the methods line up

  //When use arbitrum, you can see the same pool on the ethereum mainnet

  // const tokenSymbol0 = await tokenContract0.symbol();
  const tokenSymbol0 = 'WBTC';
  // const tokenSymbol1 = await tokenContract1.symbol();
  const tokenSymbol1 = 'ETH';
  // const tokenDecimals0 = await tokenContract0.decimals();
  const tokenDecimals0 = 8;
  // const tokenDecimals1 = await tokenContract1.decimals();
  const tokenDecimals1 = 18;

  const quoterContract = new ethers.Contract(
    quoterAddress,
    QuoterABI,
    provider
  );

  const immutables = await getPoolImmutables(poolContract);

  // https://docs.uniswap.org/protocol/reference/periphery/lens/QuoterV2
  const amountIn = ethers.utils.parseUnits(
    inputAmount.toString(),
    tokenDecimals0
  );

  const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
    immutables.token0,
    immutables.token1,
    immutables.fee, //500
    amountIn,
    0
  );

  const amountOut = ethers.utils.formatUnits(quotedAmountOut, tokenDecimals1);

  console.log('=========');
  console.log(
    `${inputAmount} ${tokenSymbol0} can be swapped for ${amountOut} ${tokenSymbol1}`
  );
  console.log('=========');

  /////////////////////////

  const amountEthIn = ethers.utils.parseUnits(
    inputAmount.toString(),
    tokenDecimals1
  );

  const quotedEthAmountOut =
    await quoterContract.callStatic.quoteExactOutputSingle(
      immutables.token0,
      immutables.token1,
      immutables.fee, //500
      amountEthIn,
      0
    );

  const amountBtcOut = ethers.utils.formatUnits(
    quotedEthAmountOut,
    tokenDecimals0
  );

  console.log('=========');
  console.log(
    `${inputAmount} ${tokenSymbol1} can be swapped for ${amountBtcOut} ${tokenSymbol0}`
  );
  console.log('=========');
};

// how many ETH that one WBTC worth
// how many WBTC that one ETH worth
getPrice(1);
