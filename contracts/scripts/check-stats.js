const hre = require("hardhat");

async function main() {
    const vaultAddr = "0x58f1c453BB8F6e862e04F6392826dd7Eb5618bA3";
    const ledgerAddr = "0x926351489F7E3686F8ed2A0eceA7BF45bbAd8A14";

    const Vault = await hre.ethers.getContractFactory("BenevolenceVault");
    const vault = Vault.attach(vaultAddr);

    const Ledger = await hre.ethers.getContractFactory("ReputationLedger");
    const ledger = Ledger.attach(ledgerAddr);

    console.log("--- ON-CHAIN DIAGNOSTICS ---");

    try {
        const [deposited, distributed, verified, balance] = await vault.getStats();
        console.log("Vault Stats:");
        console.log(` - Total Distributed: ${hre.ethers.formatEther(distributed)} HAVEN`);
        console.log(` - Events Verified: ${verified}`);
        console.log(` - Vault Balance: ${hre.ethers.formatEther(balance)} HAVEN`);
    } catch (e) {
        console.log("Error reading Vault stats:", e.message);
    }

    try {
        const [participants, totalScore] = await ledger.getGlobalStats();
        console.log("\nLedger Stats:");
        console.log(` - Total Participants: ${participants}`);
        console.log(` - Total Impact Score: ${totalScore}`);
    } catch (e) {
        console.log("Error reading Ledger stats:", e.message);
    }

    const target = "0xaFCF3422d3Ad2f88d94097626362a4c466f9555b";
    try {
        const [score, count, time, rank] = await ledger.getReputation(target);
        console.log(`\nUser (${target}) Stats:`);
        console.log(` - Score: ${score}`);
        console.log(` - Event Count: ${count}`);
    } catch (e) {
        console.log("Error reading target reputation:", e.message);
    }
}

main().catch(console.error);
