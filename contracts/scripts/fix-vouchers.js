const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const deployed = JSON.parse(fs.readFileSync("./deployed-addresses.json", "utf8"));
    const sidAddress = deployed.SovereignID;

    // We need the admin to call markHumanVerified
    const [admin] = await ethers.getSigners();
    console.log("Admin address:", admin.address);

    const SovereignID = await ethers.getContractFactory("SovereignID");
    const sovereignID = SovereignID.attach(sidAddress);

    const vouchers = [
        "0xaFCF3422d3Ad2f88d94097626362a4c466f9555b",
        "0xF782207c2CD899bCc2476F3e7E9185B2bb675314",
        "0x248183fF41154095Ac127C87429e79472e15A86c"
    ];

    for (const v of vouchers) {
        console.log(`\nChecking voucher: ${v}`);
        const hasId = await sovereignID.hasIdentity(v);
        console.log(` - hasIdentity: ${hasId}`);

        if (hasId) {
            const identity = await sovereignID.getIdentity(v);
            // Identity struct is: [isActive, isVerifiedHuman, didDocument, biometricHash]
            const isVerified = identity[1];
            console.log(` - isVerifiedHuman: ${isVerified}`);

            if (!isVerified) {
                console.log(`   > Fixing: Marking ${v} as human verified...`);
                try {
                    const tx = await sovereignID.connect(admin).markHumanVerified(v);
                    await tx.wait();
                    console.log(`   ✅ Successfully verified human: ${v}`);
                } catch (e) {
                    console.error(`   ❌ Failed to verify human: ${e.message}`);
                }
            }
        } else {
            console.log(`   ❌ ERROR: Address ${v} MUST have an identity minted first before it can be a voucher!`);
            // We can optionally mint a dummy identity for them here if we want, but since they are genesis
            // the genesis slots might be full. Let's see if we can mint it.
            const total = await sovereignID.totalIdentities();
            console.log(`   > Total Identities currently: ${total.toString()}`);
            if (total < 3) {
                console.log(`   > Minting Genesis Identity for ${v}...`);
                const BIO_HASH = ethers.id("dummy-bio-" + v);
                const tx = await sovereignID.connect(admin).issueIdentity(v, "ipfs://dummy", "ID", BIO_HASH, []);
                await tx.wait();
                const tx2 = await sovereignID.connect(admin).markHumanVerified(v);
                await tx2.wait();
                console.log(`   ✅ Minted and verified: ${v}`);
            } else {
                console.log(`   ❌ Cannot auto-mint because Genesis slots are full. Address ${v} needs 3 OTHER vouchers to get its own identity first.`);
            }
        }
    }
}

main().catch(console.error);
