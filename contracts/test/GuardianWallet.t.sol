// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/GuardianWallet.sol";

contract GuardianWalletTest is Test {
    // Re-declare event for expectEmit
    event SuspiciousActivityFlagged(address indexed to, uint256 value, string reason);
    GuardianWallet public wallet;

    address owner = address(0x1);
    address guardian = address(0x2);
    address agent = address(0x3);
    address recipient = address(0x4);

    uint256 constant THRESHOLD = 0.1 ether;

    function setUp() public {
        vm.deal(owner, 10 ether);
        vm.deal(guardian, 1 ether);

        vm.prank(owner);
        wallet = new GuardianWallet(owner, THRESHOLD, agent);

        vm.prank(owner);
        wallet.addGuardian(guardian, "@testguardian");
    }

    // ─── Propose & Approve ─────────────────────────────────────────────────────

    function test_ProposeAndApprove() public {
        uint256 value = 0.5 ether;

        vm.prank(owner);
        uint256 txId = wallet.propose{value: value}(recipient, value, "");

        assertEq(txId, 0);
        assertEq(address(wallet).balance, value);

        uint256 recipientBefore = recipient.balance;
        vm.prank(guardian);
        wallet.approve(txId);

        assertEq(recipient.balance, recipientBefore + value);
        assertEq(address(wallet).balance, 0);

        GuardianWallet.PendingTransaction memory tx_ = wallet.getPendingTx(txId);
        assertTrue(tx_.executed);
    }

    // ─── Propose & Cancel ──────────────────────────────────────────────────────

    function test_ProposeAndCancel() public {
        uint256 value = 0.5 ether;

        vm.prank(owner);
        uint256 txId = wallet.propose{value: value}(recipient, value, "");

        uint256 ownerBefore = owner.balance;
        vm.prank(guardian);
        wallet.cancel(txId);

        assertEq(owner.balance, ownerBefore + value);

        GuardianWallet.PendingTransaction memory tx_ = wallet.getPendingTx(txId);
        assertTrue(tx_.cancelled);
    }

    // ─── Direct Transfer ───────────────────────────────────────────────────────

    function test_ExecuteDirectly() public {
        uint256 value = 0.05 ether;
        uint256 recipientBefore = recipient.balance;

        vm.prank(owner);
        wallet.executeDirectly{value: value}(recipient, value, "");

        assertEq(recipient.balance, recipientBefore + value);
    }

    // ─── Risk Score ────────────────────────────────────────────────────────────

    function test_SetRiskScore() public {
        vm.prank(owner);
        uint256 txId = wallet.propose{value: 0.5 ether}(recipient, 0.5 ether, "");

        vm.prank(agent);
        wallet.setRiskScore(txId, 85, "First time recipient + large amount + unusual hour");

        GuardianWallet.PendingTransaction memory tx_ = wallet.getPendingTx(txId);
        assertEq(tx_.riskScore, 85);
        assertTrue(tx_.riskScoreSet);
    }

    function test_SetRiskScore_EmitsSuspicious() public {
        vm.prank(owner);
        uint256 txId = wallet.propose{value: 0.5 ether}(recipient, 0.5 ether, "");

        vm.expectEmit(true, false, false, true);
        emit SuspiciousActivityFlagged(recipient, 0.5 ether, "CRITICAL risk");

        vm.prank(agent);
        wallet.setRiskScore(txId, 90, "CRITICAL risk");
    }

    // ─── Access Control ────────────────────────────────────────────────────────

    function test_RevertIf_NonOwnerProposes() public {
        vm.deal(recipient, 1 ether);
        vm.prank(recipient);
        vm.expectRevert("GuardianWallet: not owner");
        wallet.propose{value: 0.5 ether}(recipient, 0.5 ether, "");
    }

    function test_RevertIf_NonGuardianApproves() public {
        vm.prank(owner);
        uint256 txId = wallet.propose{value: 0.5 ether}(recipient, 0.5 ether, "");

        vm.prank(recipient);
        vm.expectRevert("GuardianWallet: not guardian");
        wallet.approve(txId);
    }

    function test_RevertIf_NonAgentSetsRisk() public {
        vm.prank(owner);
        uint256 txId = wallet.propose{value: 0.5 ether}(recipient, 0.5 ether, "");

        vm.prank(recipient);
        vm.expectRevert("GuardianWallet: not agent");
        wallet.setRiskScore(txId, 50, "attempt");
    }

    function test_RevertIf_DoubleApprove() public {
        vm.prank(owner);
        uint256 txId = wallet.propose{value: 0.5 ether}(recipient, 0.5 ether, "");

        vm.prank(guardian);
        wallet.approve(txId);

        vm.prank(guardian);
        vm.expectRevert("GuardianWallet: already executed");
        wallet.approve(txId);
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function test_SetThreshold() public {
        vm.prank(owner);
        wallet.setThreshold(1 ether);
        assertEq(wallet.threshold(), 1 ether);
    }

    function test_RemoveGuardian() public {
        vm.prank(owner);
        wallet.removeGuardian(guardian);
        assertFalse(wallet.isGuardian(guardian));
    }
}
