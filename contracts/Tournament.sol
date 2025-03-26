// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Importing ERC-721 interface for NFT integration (optional)
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// Importing ReentrancyGuard to protect against reentrancy attacks
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// managment roles.
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract TournamentPlatform is ReentrancyGuard, AccessControl {
    uint256 public tournamentCount;
    IERC721 public nftBadgeContract; // ERC-721 NFT badge contract (optional)
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // Tournament structure
    struct Tournament {
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 currentPlayers;
        uint256 startTime;
        uint256 lobbyDeadline;
        string gameType;
        address[] players; // Array of players (we can use an array for this field)
        bool isActive;
        bool isCancelled;
        mapping(address => uint256) scores; // Mapping to track player scores
    }

    // Mapping for tournaments and player registrations
    mapping(uint256 => Tournament) public tournaments;

    // Events
    event TournamentCreated(
        uint256 tournamentId,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime,
        uint256 lobbyDeadline,
        string gameType
    );
    event PlayerJoined(uint256 tournamentId, address player);
    event TournamentCancelled(uint256 tournamentId);
    event TournamentCompleted(
        uint256 tournamentId,
        address winner,
        uint256 rewardAmount
    );
    event RewardDistributed(
        uint256 tournamentId,
        address[3] winners,
        uint256[3] rewardAmounts
    );

    // Modifier to check if a tournament exists
    modifier tournamentExists(uint256 tournamentId) {
        require(
            tournaments[tournamentId].entryFee > 0,
            "Tournament does not exist"
        );
        _;
    }

    // Constructor to set admin and NFT badge contract address
    constructor(address _nftBadgeContract, address _managerRole) {
        nftBadgeContract = IERC721(_nftBadgeContract); // Optional NFT Badge contract
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(MANAGER_ROLE, _managerRole);
    }

    // Admin function to create a tournament
    function createTournament(
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime,
        uint256 lobbyDeadline,
        string memory gameType
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(entryFee > 0, "Entry fee must be greater than 0");
        require(maxPlayers > 0, "Max players must be greater than 0");
        require(
            startTime > block.timestamp,
            "Start time must be in the future"
        );
        require(
            lobbyDeadline > block.timestamp,
            "Lobby deadline must be in the future"
        );

        tournamentCount++;
        uint256 tournamentId = tournamentCount;

        // Initialize the tournament struct without directly assigning to the mapping
        Tournament storage newTournament = tournaments[tournamentId];
        newTournament.entryFee = entryFee;
        newTournament.maxPlayers = maxPlayers;
        newTournament.startTime = startTime;
        newTournament.lobbyDeadline = lobbyDeadline;
        newTournament.gameType = gameType;
        newTournament.isActive = true;
        newTournament.isCancelled = false;
        // players array is automatically initialized as empty

        emit TournamentCreated(
            tournamentId,
            entryFee,
            maxPlayers,
            startTime,
            lobbyDeadline,
            gameType
        );
    }

    // Player joins a tournament
    function joinTournament(
        uint256 tournamentId
    ) external payable tournamentExists(tournamentId) nonReentrant {
        Tournament storage tournament = tournaments[tournamentId];

        require(tournament.isActive, "Tournament is not active");
        require(
            tournament.currentPlayers < tournament.maxPlayers,
            "Tournament is full"
        );
        require(
            block.timestamp <= tournament.lobbyDeadline,
            "Lobby deadline has passed"
        );

        uint256 entryFee = tournament.entryFee;

        // If player has an NFT badge, apply discount (optional feature)
        if (nftBadgeContract.balanceOf(msg.sender) > 0) {
            entryFee = entryFee / 2; // 50% discount
        }

        require(msg.value == entryFee, "Incorrect entry fee");

        tournament.players.push(msg.sender);
        tournament.currentPlayers++;

        emit PlayerJoined(tournamentId, msg.sender);

        // Automatically close the tournament when max players are reached
        if (tournament.currentPlayers == tournament.maxPlayers) {
            tournament.isActive = false;
        }
    }

    // Cancel tournament if lobby isn't filled within the deadline
    function cancelTournament(
        uint256 tournamentId
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        tournamentExists(tournamentId)
        nonReentrant
    {
        Tournament storage tournament = tournaments[tournamentId];

        require(
            block.timestamp > tournament.lobbyDeadline,
            "Lobby deadline has not passed"
        );
        require(
            tournament.currentPlayers < tournament.maxPlayers,
            "Tournament is already filled"
        );

        tournament.isCancelled = true;
        tournament.isActive = false;

        // Refund players
        for (uint256 i = 0; i < tournament.players.length; i++) {
            payable(tournament.players[i]).transfer(tournament.entryFee);
        }

        emit TournamentCancelled(tournamentId);
    }

    // Submit score for the player in the tournament (use backend API to trigger this)
    function submitScore(
        uint256 tournamentId,
        uint256 score,
        address _player
    )
        external
        tournamentExists(tournamentId)
        nonReentrant
        onlyRole(MANAGER_ROLE)
    {
        Tournament storage tournament = tournaments[tournamentId];
        require(
            tournament.lobbyDeadline > block.timestamp,
            "Lobby deadline has not passed"
        );
        tournament.scores[_player] += score;
    }

    // View function to get the score of a player in a tournament
    function getPlayerScore(
        uint256 tournamentId,
        address player
    ) external view tournamentExists(tournamentId) returns (uint256) {
        Tournament storage tournament = tournaments[tournamentId];
        return tournament.scores[player];
    }

    // Complete the tournament, calculate and distribute rewards
    function completeTournament(
        uint256 tournamentId
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        tournamentExists(tournamentId)
        nonReentrant
    {
        Tournament storage tournament = tournaments[tournamentId];
        require(
            block.timestamp >= tournament.startTime,
            "Tournament has not started yet"
        );
        require(tournament.isActive == false, "Tournament is still active");

        // Create an array to store player scores
        address[] memory players = tournament.players;
        uint256[] memory scores = new uint256[](players.length);

        // Gather players and their scores
        for (uint256 i = 0; i < players.length; i++) {
            scores[i] = tournament.scores[players[i]];
        }

        // Sort players by score (simple bubble sort for demonstration)
        for (uint256 i = 0; i < players.length; i++) {
            for (uint256 j = i + 1; j < players.length; j++) {
                if (scores[i] < scores[j]) {
                    uint256 tempScore = scores[i];
                    address tempPlayer = players[i];

                    scores[i] = scores[j];
                    players[i] = players[j];

                    scores[j] = tempScore;
                    players[j] = tempPlayer;
                }
            }
        }

        // Ensure there are at least 3 players to distribute rewards
        require(
            players.length >= 3,
            "Not enough players to distribute rewards"
        );

        // Distribute rewards (50% to 1st, 30% to 2nd, and 20% to 3rd)
        uint256 totalReward = address(this).balance;
        uint256 firstReward = (totalReward * 50) / 100;
        uint256 secondReward = (totalReward * 30) / 100;
        uint256 thirdReward = (totalReward * 20) / 100;

        // Declare arrays to store winners and reward amounts
        address[3] memory winners;
        uint256[3] memory rewardAmounts;

        // Assign winners and reward amounts
        winners[0] = players[0]; // 1st place
        winners[1] = players[1]; // 2nd place
        winners[2] = players[2]; // 3rd place

        rewardAmounts[0] = firstReward;
        rewardAmounts[1] = secondReward;
        rewardAmounts[2] = thirdReward;

        // Transfer rewards to the top 3 players
        payable(winners[0]).transfer(firstReward);
        payable(winners[1]).transfer(secondReward);
        payable(winners[2]).transfer(thirdReward);

        // Emit the event
        emit RewardDistributed(tournamentId, winners, rewardAmounts);
    }

    // Withdraw platform funds (admin only)
    function withdraw(
        address _admin
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        payable(_admin).transfer(address(this).balance);
    }

    // Get tournament details
    function getTournamentDetails(
        uint256 tournamentId
    )
        external
        view
        returns (
            uint256 entryFee,
            uint256 maxPlayers,
            uint256 currentPlayers,
            uint256 startTime,
            uint256 lobbyDeadline,
            string memory gameType,
            bool isActive,
            bool isCancelled
        )
    {
        Tournament storage tournament = tournaments[tournamentId];
        return (
            tournament.entryFee,
            tournament.maxPlayers,
            tournament.currentPlayers,
            tournament.startTime,
            tournament.lobbyDeadline,
            tournament.gameType,
            tournament.isActive,
            tournament.isCancelled
        );
    }
}
