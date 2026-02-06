module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 6721975,
      gasPrice: 20000000000
    },
    poa: {
      host: "127.0.0.1",
      port: 8545,
      network_id: 1337, // Custom PoA network ID
      gas: 6721975,
      gasPrice: 0, // PoA typically has no gas costs in private networks
      from: undefined // TODO: Set default account address
    }
  },

  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },

  mocha: {
    timeout: 100000
  }
};
