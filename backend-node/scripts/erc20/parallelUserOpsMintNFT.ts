import { ethers } from "ethers";
const chalk = require('chalk')
import inquirer from "inquirer";
import {
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";
  import { Bundler } from "@biconomy/bundler";
  import { BiconomyPaymaster } from "@biconomy/paymaster";
import {
  IHybridPaymaster,
  PaymasterFeeQuote,
  PaymasterMode,
  SponsorUserOperationDto,
} from "@biconomy/paymaster";
import config from "../../config.json";
import { ECDSAOwnershipValidationModule, MultiChainValidationModule, DEFAULT_ECDSA_OWNERSHIP_MODULE, DEFAULT_MULTICHAIN_MODULE, DEFAULT_SESSION_KEY_MANAGER_MODULE  } from "@biconomy/modules";
import { UserOperation } from "@biconomy/core-types";

const numOfParallelUserOps = config.numOfParallelUserOps;

export const parallelUserOpsMintNFTPayERC20 = async () => {
  // ------------------------STEP 1: Initialise Biconomy Smart Account SDK--------------------------------//  



  // get EOA address from wallet provider
  let provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  let signer = new ethers.Wallet(config.privateKey, provider);
  const eoa = await signer.getAddress();
  console.log(chalk.blue(`EOA address: ${eoa}`));

  // create bundler and paymaster instances
  const bundler = new Bundler({
    bundlerUrl: config.bundlerUrl,
    chainId: config.chainId,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
  });

  const paymaster = new BiconomyPaymaster({
    paymasterUrl: config.biconomyPaymasterUrl
  });

  const ecdsaModule = await ECDSAOwnershipValidationModule.create({
    signer: signer,
    moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
  })

  // Biconomy smart account config
  // Note that paymaster and bundler are optional. You can choose to create new instances of this later and make account API use 
  const biconomySmartAccountConfig = {
    signer: signer,
    chainId: config.chainId,
    rpcUrl: config.rpcUrl,
    paymaster: paymaster, 
    bundler: bundler, 
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    defaultValidationModule: ecdsaModule,
    activeValidationModule: ecdsaModule
  };

  // create biconomy smart account instance
  const biconomySmartAccount = await BiconomySmartAccountV2.create(biconomySmartAccountConfig);

  
  // ------------------------STEP 2: Build Partial User op from your user Transaction/s Request --------------------------------//

  // generate mintNft data
  const nftInterface = new ethers.utils.Interface([
    "function safeMint(address _to)",
  ]);

 
  const scwAddress = await biconomySmartAccount.getAccountAddress();

  // Here we are minting NFT to smart account address itself
  const data = nftInterface.encodeFunctionData("safeMint", [scwAddress]);

  const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e"; // Todo // use from config
  const transaction = {
    to: nftAddress,
    data: data,
  };

  let partialUserOps = [];
  let finalUserOps = [];

  // use a nonceKey that is unique
  // easy way is to increment the nonceKey

  for (let nonceKey = 0; nonceKey < numOfParallelUserOps; nonceKey++) {
    // build partial userOp 
    let partialUserOp = await biconomySmartAccount.buildUserOp([transaction], { nonceOptions: { nonceKey }});
    partialUserOps.push(partialUserOp);
  }


  // ------------------------STEP 3: Get Fee quotes (for ERC20 payment) from the paymaster and ask the user to select one--------------------------------//

  const biconomyPaymaster =
    biconomySmartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

  for (let index = 0; index < numOfParallelUserOps; index++) {
    const feeQuotesResponse =
    await biconomyPaymaster.getPaymasterFeeQuotesOrData(partialUserOps[index], {
      // here we are explicitly telling by mode ERC20 that we want to pay in ERC20 tokens and expect fee quotes
      mode: PaymasterMode.ERC20,
      // one can pass tokenList empty array. and it would return fee quotes for all tokens supported by the Biconomy paymaster
      tokenList: config.tokenList ? config.tokenList : [],
      // preferredToken is optional. If you want to pay in a specific token, you can pass its address here and get fee quotes for that token only
      preferredToken: config.preferredToken,
    });

    const feeQuotes = feeQuotesResponse.feeQuotes as PaymasterFeeQuote[];
    const spender = feeQuotesResponse.tokenPaymasterAddress || "";


    // Generate list of options for the user to select
    const choices = feeQuotes?.map((quote: any, index: number) => ({
        name: `Option ${index + 1}: ${quote.maxGasFee}: ${quote.symbol} `,
        value: index,
      }));
    // Use inquirer to prompt user to select an option
    const { selectedOption } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedOption",
          message: "Select a fee quote:",
          choices,
        },
      ]);
    const selectedFeeQuote = feeQuotes[selectedOption];



    // ------------------------STEP 3: Once you have selected feeQuote (use has chosen token to pay with) get updated userOp which checks for paymaster approval and appends approval tx--------------------------------//
      

    let finalUserOp = await biconomySmartAccount.buildTokenPaymasterUserOp(
      partialUserOps[index],
      {
        feeQuote: selectedFeeQuote,
        spender: spender,
        maxApproval: false,
      }
    );
    // ------------------------STEP 4: Get Paymaster and Data from Biconomy Paymaster --------------------------------//  


    let paymasterServiceData = {
      mode: PaymasterMode.ERC20, // - mandatory // now we know chosen fee token and requesting paymaster and data for it
      feeTokenAddress: selectedFeeQuote.tokenAddress,
      // optional params..
      calculateGasLimits: true, // Always recommended and especially when using token paymaster
    };

    try{
      const paymasterAndDataWithLimits =
        await biconomyPaymaster.getPaymasterAndData(
          finalUserOp,
          paymasterServiceData
        );
      finalUserOp.paymasterAndData = paymasterAndDataWithLimits.paymasterAndData;

      // below code is only needed if you sent the flag calculateGasLimits = true
      if (
        paymasterAndDataWithLimits.callGasLimit &&
        paymasterAndDataWithLimits.verificationGasLimit &&
        paymasterAndDataWithLimits.preVerificationGas
      ) {

        // Returned gas limits must be replaced in your op as you update paymasterAndData.
        // Because these are the limits paymaster service signed on to generate paymasterAndData
        // If you receive AA34 error check here..   

        finalUserOp.callGasLimit = paymasterAndDataWithLimits.callGasLimit;
        finalUserOp.verificationGasLimit =
          paymasterAndDataWithLimits.verificationGasLimit;
        finalUserOp.preVerificationGas =
          paymasterAndDataWithLimits.preVerificationGas;
      }
      finalUserOps.push(finalUserOp);
    } catch (e) {
      console.log("error received ", e);
    }
  }


  // ------------------------STEP 5: Sign the UserOp and send to the Bundler--------------------------------//




  // Below function gets the signature from the user (signer provided in Biconomy Smart Account) 
  // and also send the full op to attached bundler instance

  try {
    let userOpResponsePromises = [];
    /**
     * Will shuffle userOps here based on a random logic and send them randomly
     */
    const shuffledPartialUserOps = partialUserOps.sort(() => Math.random() - 0.5);
    for (let index = 0; index < numOfParallelUserOps; index++) {
      console.log(chalk.blue(`userOp: ${JSON.stringify(shuffledPartialUserOps[index], null, "\t")}`));
      console.log(chalk.blue(`userOp nonce being sent to bundler: ${JSON.stringify(Number(shuffledPartialUserOps[index].nonce), null, "\t")}`))
      const userOpResponsePromise = biconomySmartAccount.sendUserOp(shuffledPartialUserOps[index]);
      userOpResponsePromises.push(userOpResponsePromise)
    }

    const userOpResponses = await Promise.all(userOpResponsePromises);

    for (let index = 0; index < numOfParallelUserOps; index++) {
      const transactionDetails = await userOpResponses[index].wait();
      console.log(
        chalk.blue(
          `transactionDetails: ${JSON.stringify(transactionDetails, null, "\t")}`
        )
      );
    }
  } catch (e) {
    console.log("error received ", e);
  }
};