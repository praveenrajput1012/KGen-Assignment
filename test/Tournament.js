const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentPlatform", function () {
  let TournamentPlatform;
  let tournamentPlatform;
  let owner;
  let player1;
  let player2;
  let nftBadgeContract;
  let nftBadgeToken;

  beforeEach(async function () {
    // Get the signers
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy a simple mock NFT Badge contract (ERC721)
    const MockNFTBadge = await ethers.getContractFactory("MockNFT");
    nftBadgeToken = await MockNFTBadge.deploy();
    // await nftBadgeToken.deployed(); // Ensure it is deployed correctly

    console.log("NFT Badge contract deployed at:", nftBadgeToken.address);

    // Deploy the TournamentPlatform contract
    TournamentPlatform = await ethers.getContractFactory("TournamentPlatform");
    tournamentPlatform = await TournamentPlatform.deploy(nftBadgeToken.address);
    // await tournamentPlatform.deployed(); // Ensure it is deployed correctly

    console.log(
      "TournamentPlatform contract deployed at:",
      tournamentPlatform.address
    );
  });

    it("should allow the admin to create a tournament", async function () {
      const entryFee = ethers.utils.parseEther("1");
      const maxPlayers = 4;
      const startTime =
        (await ethers.provider.getBlock("latest")).timestamp + 1000;
      const lobbyDeadline = startTime + 500;

      await expect(
        tournamentPlatform.createTournament(
          entryFee,
          maxPlayers,
          startTime,
          lobbyDeadline,
          "Game A"
        )
      )
        .to.emit(tournamentPlatform, "TournamentCreated")
        .withArgs(1, entryFee, maxPlayers, startTime, lobbyDeadline, "Game A");

      const tournamentDetails = await tournamentPlatform.getTournamentDetails(1);
      expect(tournamentDetails.entryFee).to.equal(entryFee);
      expect(tournamentDetails.maxPlayers).to.equal(maxPlayers);
      expect(tournamentDetails.gameType).to.equal("Game A");
    });

  //   it("should allow players to join a tournament", async function () {
  //     const entryFee = ethers.utils.parseEther("1");
  //     const maxPlayers = 4;
  //     const startTime =
  //       (await ethers.provider.getBlock("latest")).timestamp + 1000;
  //     const lobbyDeadline = startTime + 500;

  //     await tournamentPlatform.createTournament(
  //       entryFee,
  //       maxPlayers,
  //       startTime,
  //       lobbyDeadline,
  //       "Game A"
  //     );

  //     // Player 1 joins the tournament
  //     await expect(
  //       tournamentPlatform.connect(player1).joinTournament(1, { value: entryFee })
  //     )
  //       .to.emit(tournamentPlatform, "PlayerJoined")
  //       .withArgs(1, player1.address);

  //     const tournamentDetails = await tournamentPlatform.getTournamentDetails(1);
  //     expect(tournamentDetails.currentPlayers).to.equal(1);
  //     expect(tournamentDetails.players[0]).to.equal(player1.address);
  //   });

  //   it("should allow players with NFT badges to get a discount", async function () {
  //     const entryFee = ethers.utils.parseEther("1");
  //     const maxPlayers = 4;
  //     const startTime =
  //       (await ethers.provider.getBlock("latest")).timestamp + 1000;
  //     const lobbyDeadline = startTime + 500;

  //     await tournamentPlatform.createTournament(
  //       entryFee,
  //       maxPlayers,
  //       startTime,
  //       lobbyDeadline,
  //       "Game A"
  //     );

  //     // Mint NFT badge for player1
  //     await nftBadgeToken.mint(player1.address);

  //     // Player 1 joins the tournament with the discounted entry fee
  //     await expect(
  //       tournamentPlatform
  //         .connect(player1)
  //         .joinTournament(1, { value: entryFee.div(2) })
  //     )
  //       .to.emit(tournamentPlatform, "PlayerJoined")
  //       .withArgs(1, player1.address);

  //     const tournamentDetails = await tournamentPlatform.getTournamentDetails(1);
  //     expect(tournamentDetails.currentPlayers).to.equal(1);
  //   });

  //   it("should revert if player sends incorrect entry fee", async function () {
  //     const entryFee = ethers.utils.parseEther("1");
  //     const maxPlayers = 4;
  //     const startTime =
  //       (await ethers.provider.getBlock("latest")).timestamp + 1000;
  //     const lobbyDeadline = startTime + 500;

  //     await tournamentPlatform.createTournament(
  //       entryFee,
  //       maxPlayers,
  //       startTime,
  //       lobbyDeadline,
  //       "Game A"
  //     );

  //     // Player 1 tries to join with incorrect entry fee
  //     await expect(
  //       tournamentPlatform
  //         .connect(player1)
  //         .joinTournament(1, { value: ethers.utils.parseEther("0.5") })
  //     ).to.be.revertedWith("Incorrect entry fee");
  //   });

  //   it("should cancel the tournament if not enough players join", async function () {
  //     const entryFee = ethers.utils.parseEther("1");
  //     const maxPlayers = 4;
  //     const startTime =
  //       (await ethers.provider.getBlock("latest")).timestamp + 1000;
  //     const lobbyDeadline = startTime + 500;

  //     await tournamentPlatform.createTournament(
  //       entryFee,
  //       maxPlayers,
  //       startTime,
  //       lobbyDeadline,
  //       "Game A"
  //     );

  //     // Cancel the tournament as it's not filled with players
  //     await expect(tournamentPlatform.connect(owner).cancelTournament(1))
  //       .to.emit(tournamentPlatform, "TournamentCancelled")
  //       .withArgs(1);

  //     const tournamentDetails = await tournamentPlatform.getTournamentDetails(1);
  //     expect(tournamentDetails.isCancelled).to.equal(true);
  //   });

  //   it("should allow the admin to complete the tournament", async function () {
  //     const entryFee = ethers.utils.parseEther("1");
  //     const maxPlayers = 2;
  //     const startTime =
  //       (await ethers.provider.getBlock("latest")).timestamp + 1000;
  //     const lobbyDeadline = startTime + 500;

  //     await tournamentPlatform.createTournament(
  //       entryFee,
  //       maxPlayers,
  //       startTime,
  //       lobbyDeadline,
  //       "Game A"
  //     );

  //     // Player 1 joins the tournament
  //     await tournamentPlatform
  //       .connect(player1)
  //       .joinTournament(1, { value: entryFee });

  //     // Player 2 joins the tournament
  //     await tournamentPlatform
  //       .connect(player2)
  //       .joinTournament(1, { value: entryFee });

  //     // Admin completes the tournament
  //     await expect(tournamentPlatform.connect(owner).completeTournament(1))
  //       .to.emit(tournamentPlatform, "RewardDistributed")
  //       .withArgs(1, player1.address, ethers.utils.parseEther("1")); // assuming player1 wins

  //     const tournamentDetails = await tournamentPlatform.getTournamentDetails(1);
  //     expect(tournamentDetails.isActive).to.equal(false);
  //   });

  //   it("should not allow submitting score before the tournament is complete", async function () {
  //     const entryFee = ethers.utils.parseEther("1");
  //     const maxPlayers = 2;
  //     const startTime =
  //       (await ethers.provider.getBlock("latest")).timestamp + 1000;
  //     const lobbyDeadline = startTime + 500;

  //     await tournamentPlatform.createTournament(
  //       entryFee,
  //       maxPlayers,
  //       startTime,
  //       lobbyDeadline,
  //       "Game A"
  //     );

  //     // Player 1 joins the tournament
  //     await tournamentPlatform
  //       .connect(player1)
  //       .joinTournament(1, { value: entryFee });

  //     // Player 1 tries to submit a score before the tournament ends
  //     await expect(
  //       tournamentPlatform.connect(player1).submitScore(1, 100)
  //     ).to.be.revertedWith("Tournament has not started or is ongoing");
  //   });

  //   it("should allow the admin to withdraw funds", async function () {
  //     const entryFee = ethers.utils.parseEther("1");
  //     const maxPlayers = 2;
  //     const startTime =
  //       (await ethers.provider.getBlock("latest")).timestamp + 1000;
  //     const lobbyDeadline = startTime + 500;

  //     await tournamentPlatform.createTournament(
  //       entryFee,
  //       maxPlayers,
  //       startTime,
  //       lobbyDeadline,
  //       "Game A"
  //     );

  //     // Player 1 joins the tournament
  //     await tournamentPlatform
  //       .connect(player1)
  //       .joinTournament(1, { value: entryFee });

  //     // Player 2 joins the tournament
  //     await tournamentPlatform
  //       .connect(player2)
  //       .joinTournament(1, { value: entryFee });

  //     const initialBalance = await ethers.provider.getBalance(owner.address);

  //     // Admin withdraws funds
  //     await expect(
  //       tournamentPlatform.connect(owner).withdraw()
  //     ).to.changeEtherBalance(owner, ethers.utils.parseEther("2"));

  //     const finalBalance = await ethers.provider.getBalance(owner.address);
  //     expect(finalBalance).to.be.gt(initialBalance);
  //   });
});
