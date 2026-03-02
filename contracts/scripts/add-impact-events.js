const hre = require("hardhat");

async function main() {
    const [admin] = await hre.ethers.getSigners();

    // Alamat Dompet yang mau di-cheat jumlah event-nya
    // Silakan ganti ke alamat MetaMask Anda
    const targetAddress = "0xaFCF3422d3Ad2f88d94097626362a4c466f9555b";
    const numberOfEventsToAdd = 15; // Butuh minimal 10 untuk bikin proposal
    const scorePerEvent = 10; // Tambah 10 poin per event

    console.log(`🔥 Menambahkan ${numberOfEventsToAdd} Impact Events palsu ke ${targetAddress}...`);
    const ledgerAddress = process.env.REPUTATION_LEDGER_ADDRESS;
    const Ledger = await hre.ethers.getContractFactory("ReputationLedger");
    const ledger = Ledger.attach(ledgerAddress);

    // 1. Cek VAULT_ROLE (Siapa yang boleh nambah skor)
    const VAULT_ROLE = await ledger.VAULT_ROLE();
    const hasRole = await ledger.hasRole(VAULT_ROLE, admin.address);

    if (!hasRole) {
        console.log("🔐 Memberikan akses VAULT_ROLE sementara ke Admin...");
        const txGrant = await ledger.grantRole(VAULT_ROLE, admin.address);
        await txGrant.wait();
        console.log("✅ Akses VAULT_ROLE berhasil diberikan!");
    }

    // 2. Beri Skor Berulang Kali (Simulasi submit laporan berkali-kali)
    console.log(`⚡ Eksekusi loop pengiriman Impact Events...`);

    for (let i = 0; i < numberOfEventsToAdd; i++) {
        // Event hash harus unik
        const adminEventHash = hre.ethers.id("ADMIN_EVENT_CHEAT_" + Date.now() + "_" + i);

        console.log(`⏳ [${i + 1}/${numberOfEventsToAdd}] Menambahkan 1 Verified Event...`);
        const txUpdate = await ledger.updateReputation(targetAddress, scorePerEvent, adminEventHash, { gasLimit: 2000000 });
        await txUpdate.wait();
    }

    console.log(`🎉 SUKSES! Target ${targetAddress} sekarang mendapat tambahan ${numberOfEventsToAdd} Verified Events.`);
    console.log(`✅ Syarat "Minimal 10 Verified Events untuk Proposal" telah terpenuhi!`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
