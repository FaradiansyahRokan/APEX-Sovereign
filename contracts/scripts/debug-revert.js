const hre = require("hardhat");

async function main() {
    const [admin] = await hre.ethers.getSigners();
    const ledgerAddress = process.env.REPUTATION_LEDGER_ADDRESS;
    console.log("Admin address:", admin.address);
    console.log("Ledger address:", ledgerAddress);

    if (!ledgerAddress) {
        console.error("REPUTATION_LEDGER_ADDRESS is missing in .env");
        return;
    }

    const Ledger = await hre.ethers.getContractFactory("ReputationLedger");
    const ledger = Ledger.attach(ledgerAddress);

    try {
        const adminEventHash = hre.ethers.id("ADMIN_CHEAT_CODE_" + Date.now());
        console.log("Sending tx...");
        const tx = await ledger.updateReputation(admin.address, 1500000, adminEventHash, { gasLimit: 500000 });
        console.log("Tx hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("Mined!", receipt.status);
    } catch (e) {
        console.log(e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
