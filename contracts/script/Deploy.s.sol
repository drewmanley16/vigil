// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/GuardianWallet.sol";

contract Deploy is Script {
    function run() external {
        address owner = vm.envAddress("OWNER_ADDRESS");
        address agentAddr = vm.envAddress("AGENT_ADDRESS");
        uint256 thresholdEth = vm.envOr("THRESHOLD_ETH", uint256(1)); // default 1 ETH

        uint256 thresholdWei = thresholdEth * 1e18;

        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        GuardianWallet wallet = new GuardianWallet(owner, thresholdWei, agentAddr);

        console.log("GuardianWallet deployed at:", address(wallet));
        console.log("  Owner:     ", owner);
        console.log("  Agent:     ", agentAddr);
        console.log("  Threshold: ", thresholdWei, "wei");

        vm.stopBroadcast();
    }
}
