## SDK by Example

This repository contains a set of examples that demonstrate how to use the Biconomy SDk smart-account to build decentralised applications.
The SmartAccount package generates a smart wallet contract for each user EOA. It takes a provider, provider can be anything, here we have different examples of providers.

### Important Links

- [Biconomy Docs](https://docs.biconomy.io/sdk)
- [Contract Addresses](https://biconomy.gitbook.io/sdk/contracts/contract-addresses)

### Examples

| Project                                                 |      Library       |         Provider         |
| :------------------------------------------------------ | :----------------: | :----------------------: |
| [backend-node-cli](/backend-node)                       |      Node.js       |      smart-account       |
| [react-biconomy-web3Auth](/react-biconomy-web3Auth)     |      React.js      |    biconomy-web3Auth     |
| [react-vite-social-login](/react-vite-social-login)     | React.js + vite.js |    biconomy-web3Auth     |
| [nextjs-biconomy-web3Auth](/nextjs-biconomy-web3Auth)   |      Next.js       |    biconomy-web3Auth     |
| [react-vite-particle-auth](/react-vite-particle-auth)   | React.js + vite.js |  biconomy-particleAuth   |
| [react-native-web3Auth](/react-native-web3Auth)         |    React Native    | biconomy-web3Auth-native |
| [react-native-smartAccount](/react_native_smartAccount) |    React Native    |   ethers (private key)   |
| [nextjs-rainbow](/nextjs-rainbow)                       |      Next.js       |      rainbow wallet      |
| [nextjs-web3modal](/nextjs-web3modal)                   |      Next.js       |        web3Modal         |
| [vuejs-biconomy-web3auth](/vuejs-biconomy-web3auth)     |  Vue.js + vite.js  |    biconomy-web3Auth     |
| [nextjs-biconomy-web3Auth-nextAuth-siwe](/nextjs-biconomy-web3Auth-nextAuth-siwe) | Next.js + NextAuth.js | biconomy-web3Auth + siwe |


## Test results

### backend-node

init and config

```bash
$ yarn run smartAccount init --network=mumbai
yarn run v1.22.19
$ ts-node scripts/index.ts init --network=mumbai
Initializing config for mumbai network
network is ------ mumbai
```
it creates a local config.json file as follow:
```
{
  "privateKey": "8a29e5b5949ada265bb8e6535b3ea618674784d4a5addaff07327c3abda49cd6",
  "accountIndex": 0,
  "chainId": 80001,
  "rpcUrl": "https://rpc.ankr.com/polygon_mumbai",
  "bundlerUrl": "https://bundler.biconomy.io/api/v2/80001/cJPK7B3ru.dd7f7861-190d-45ic-af80-6877f74b8f44",
  "biconomyPaymasterUrl": "https://paymaster.biconomy.io/api/v1/80001/<YOUR_PAYMASTER_API_KEY_FROM_DASHBOARD>",
  "preferredToken": "",
  "tokenList": [],
  "numOfParallelUserOps": 10 
}
```

create a new account

```bash
$ yarn run smartAccount address
yarn run v1.22.19
$ ts-node scripts/index.ts address
EOA address: 0x1484602B2965dA619f1Fa25Ce2CecE4428876a9D
SCW Address 0x616DB7d35995Bc607a288C4641EfEA8cBfB296b5
```

```bash
$ yarn run smartAccount mint
```
