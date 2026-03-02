const { ethers, network } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Simulating APEX burn with account:", deployer.address);

    const initialBalance = await ethers.provider.getBalance(deployer.address);
    console.log("Account APEX balance:", ethers.formatEther(initialBalance));

    // Address to burn (general burn address)
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    const burnAmount = ethers.parseEther("24.0"); // 10 APEX

    console.log(`Burning 10 APEX native coins to ${burnAddress}...`);

    const tx = await deployer.sendTransaction({
        to: burnAddress,
        value: burnAmount
    });

    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Burn successful!");

    const finalBalance = await ethers.provider.getBalance(deployer.address);
    console.log("Final APEX balance:", ethers.formatEther(finalBalance));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
