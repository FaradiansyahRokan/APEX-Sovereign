const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json"));

    // We strictly use the first account (Deployer/Oracle)
    const [oracle] = await ethers.getSigners();
    console.log("Setting up Oracle Wallet as Genesis Identity...");
    console.log("Oracle Wallet:", oracle.address);

    const SovereignID = await ethers.getContractFactory("SovereignID");
    const sovereignID = SovereignID.attach(addresses.SovereignID);

    const DID_DOC = "ipfs://QmOracleSystemID";
    const COUNTRY = "US";
    const BIO_HASH = ethers.id("oracle-system-hash");

    const hasId = await sovereignID.hasIdentity(oracle.address);
    if (!hasId) {
        console.log("Minting Genesis Identity for Oracle...");
        const tx = await sovereignID.issueIdentity(oracle.address, DID_DOC, COUNTRY, BIO_HASH, []);
        await tx.wait();

        console.log("Verifying Oracle as Human...");
        const txt2 = await sovereignID.markHumanVerified(oracle.address);
        await txt2.wait();

        console.log("✅ Oracle successfully registered as a Genesis Identity.");
    } else {
        console.log("✅ Oracle already possesses a SovereignID.");
    }
}

main().catch(console.error);
