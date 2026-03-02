const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer, v1, v2, v3, volunteer] = await ethers.getSigners();

    // 1. Read SovereignID address from deployed-addresses.json
    const rawData = fs.readFileSync("./deployed-addresses.json");
    const addresses = JSON.parse(rawData);
    const sovereignIDAddress = addresses.SovereignID;
    console.log("Connected to SovereignID at:", sovereignIDAddress);

    // 2. Connect to SovereignID
    const SovereignID = await ethers.getContractFactory("SovereignID");
    const sovereignID = SovereignID.attach(sovereignIDAddress);

    const DID_DOC = "ipfs://QmDummyDIDDocument123";
    const COUNTRY = "US";
    const BIO_HASH = ethers.id("dummy-bio-hash-" + Math.random());

    // 3. Issue 3 Genesis Identities
    console.log("\n[Genesis Bypass] Issuing the first 3 identities...");

    // To avoid AlreadyHasIdentity from multiple runs, let's wrap in try/catch or just ignore errors
    const issueSafe = async (wallet, isGenesis) => {
        const hasId = await sovereignID.hasIdentity(wallet.address);
        if (!hasId) {
            const vouchers = isGenesis ? [] : [v1.address, v2.address, v3.address];
            try {
                const tx = await sovereignID.issueIdentity(wallet.address, DID_DOC, COUNTRY, BIO_HASH, vouchers);
                await tx.wait();
                console.log(`✅ Issued identity for ${wallet.address.slice(0, 6)}`);

                // If genesis, mark human
                if (isGenesis) {
                    const tx2 = await sovereignID.markHumanVerified(wallet.address);
                    await tx2.wait();
                    console.log(`   └─ Marked as Verified Human (Genesis)`);
                }
            } catch (e) {
                console.log(`❌ Failed to issue for ${wallet.address.slice(0, 6)}: ${e.message}`);
            }
        } else {
            console.log(`ℹ️ ${wallet.address.slice(0, 6)} already has an identity.`);
        }
    };

    await issueSafe(v1, true);
    await issueSafe(v2, true);
    await issueSafe(v3, true);

    console.log("\n[Social Graph] Issuing the 4th identity requiring 3 vouchers...");
    await issueSafe(volunteer, false);

    const finalTotal = await sovereignID.totalIdentities();
    console.log(`\n🎉 Total Identities Minted: ${finalTotal}`);

    if (await sovereignID.hasIdentity(volunteer.address)) {
        const v0 = await sovereignID.vouchedBy(volunteer.address, 0);
        const v1_address = await sovereignID.vouchedBy(volunteer.address, 1);
        const v2_address = await sovereignID.vouchedBy(volunteer.address, 2);
        console.log(`Volunteer was vouched by: [${v0.slice(0, 6)}, ${v1_address.slice(0, 6)}, ${v2_address.slice(0, 6)}]`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
