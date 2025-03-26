require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  solidity: {
    version: "0.8.28", // Ensure this matches the highest version you want to use
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
