/**
 * HAVEN HUMANITY — SovereignID Tests
 * Hardhat + Chai test suite  v2.0.0
 * Includes: BiometricHash and Genesis Vouching Bypass
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("SovereignID", function () {
    let sovereignID, reputationLedger;
    let admin, issuer, volunteer, volunteer2, stranger;
    let v1, v2, v3;

    const DID_DOC = "ipfs://QmTestDIDDocument";
    const COUNTRY = "ID";
    const BIO_HASH = ethers.id("test-bio-hash");

    beforeEach(async () => {
        [admin, issuer, volunteer, volunteer2, stranger, v1, v2, v3] = await ethers.getSigners();

        // Deploy ReputationLedger first (SovereignID reads from it)
        const LedgerFactory = await ethers.getContractFactory("ReputationLedger");
        reputationLedger = await LedgerFactory.deploy(admin.address);

        // Deploy SovereignID
        const SIDFactory = await ethers.getContractFactory("SovereignID");
        sovereignID = await SIDFactory.deploy(admin.address, await reputationLedger.getAddress());

        // Grant ISSUER_ROLE to issuer
        await sovereignID.grantRole(await sovereignID.ISSUER_ROLE(), issuer.address);
    });

    // ── Issue Identity (Genesis Bypass) ──────────────────────────────────────

    describe("issueIdentity() - Genesis Bypass", () => {
        it("should issue the first 3 identities with 0 vouchers", async () => {
            await sovereignID.connect(issuer).issueIdentity(v1.address, DID_DOC, COUNTRY, BIO_HASH, []);
            await sovereignID.connect(issuer).issueIdentity(v2.address, DID_DOC, COUNTRY, BIO_HASH, []);
            await sovereignID.connect(issuer).issueIdentity(v3.address, DID_DOC, COUNTRY, BIO_HASH, []);

            expect(await sovereignID.totalIdentities()).to.equal(3n);
            expect(await sovereignID.hasIdentity(v1.address)).to.be.true;
        });

        it("should revert if genesis identity provides >0 vouchers", async () => {
            await expect(
                sovereignID.connect(issuer).issueIdentity(v1.address, DID_DOC, COUNTRY, BIO_HASH, [v2.address])
            ).to.be.revertedWith("SovereignID: Genesis identities require 0 vouchers");
        });
    });

    // ── Issue Identity (Social Graph Vouching) ───────────────────────────────

    describe("issueIdentity() - Vouching Required (Token >= 3)", () => {
        beforeEach(async () => {
            // Setup 3 genesis identities
            await sovereignID.connect(issuer).issueIdentity(v1.address, DID_DOC, COUNTRY, BIO_HASH, []);
            await sovereignID.connect(issuer).issueIdentity(v2.address, DID_DOC, COUNTRY, BIO_HASH, []);
            await sovereignID.connect(issuer).issueIdentity(v3.address, DID_DOC, COUNTRY, BIO_HASH, []);

            // Mark them as human verified!
            await sovereignID.connect(issuer).markHumanVerified(v1.address);
            await sovereignID.connect(issuer).markHumanVerified(v2.address);
            await sovereignID.connect(issuer).markHumanVerified(v3.address);
        });

        it("should successfully issue the 4th identity if backed by 3 human vouchers", async () => {
            await sovereignID.connect(issuer).issueIdentity(
                volunteer.address, DID_DOC, COUNTRY, BIO_HASH, [v1.address, v2.address, v3.address]
            );
            expect(await sovereignID.hasIdentity(volunteer.address)).to.be.true;
            expect(await sovereignID.totalIdentities()).to.equal(4n);
        });

        it("should correctly record the vouching graph mappings", async () => {
            await sovereignID.connect(issuer).issueIdentity(
                volunteer.address, DID_DOC, COUNTRY, BIO_HASH, [v1.address, v2.address, v3.address]
            );
            expect(await sovereignID.vouchedBy(volunteer.address, 0)).to.equal(v1.address);
            expect(await sovereignID.vouchedBy(volunteer.address, 2)).to.equal(v3.address);
            expect(await sovereignID.voucherOf(v2.address, 0)).to.equal(volunteer.address);
        });

        it("should revert if 4th identity tries to pass 0 vouchers", async () => {
            await expect(
                sovereignID.connect(issuer).issueIdentity(volunteer.address, DID_DOC, COUNTRY, BIO_HASH, [])
            ).to.be.revertedWith("SovereignID: Requires exactly 3 vouchers");
        });

        it("should revert if voucher is a stranger with no identity", async () => {
            await expect(
                sovereignID.connect(issuer).issueIdentity(
                    volunteer.address, DID_DOC, COUNTRY, BIO_HASH, [v1.address, v2.address, stranger.address]
                )
            ).to.be.revertedWith("SovereignID: Voucher has no identity");
        });

        it("should revert if a voucher is inactive/revoked", async () => {
            // Admin revokes v3's identity
            await sovereignID.connect(admin).revokeIdentity(v3.address);

            await expect(
                sovereignID.connect(issuer).issueIdentity(
                    volunteer.address, DID_DOC, COUNTRY, BIO_HASH, [v1.address, v2.address, v3.address]
                )
            ).to.be.revertedWith("SovereignID: Voucher inactive");
        });

        it("should revert if a voucher has identity but is NOT human-verified", async () => {
            // Create a 4th identity using the 3 valid genesis vouchers
            await sovereignID.connect(issuer).issueIdentity(
                stranger.address, DID_DOC, COUNTRY, BIO_HASH, [v1.address, v2.address, v3.address]
            );

            // Stranger now tries to vouch for volunteer2 but stranger is not human-verified yet!
            await expect(
                sovereignID.connect(issuer).issueIdentity(
                    volunteer2.address, DID_DOC, "UK", BIO_HASH, [v1.address, v2.address, stranger.address]
                )
            ).to.be.revertedWith("SovereignID: Voucher not human-verified");
        });
    });

    // ── Revocation & Validation ────────────────────────────────────────────────

    describe("Basic Security Checks", () => {
        beforeEach(async () => {
            await sovereignID.connect(issuer).issueIdentity(volunteer.address, DID_DOC, COUNTRY, BIO_HASH, []);
        });

        it("should return the identity securely without Soulbound transfers", async () => {
            const identity = await sovereignID.getIdentity(volunteer.address);
            expect(identity.didDocument).to.equal(DID_DOC);
            expect(identity.countryIso).to.equal(COUNTRY);
            expect(identity.biometricHash).to.equal(BIO_HASH);

            await expect(
                sovereignID.transfer(admin.address, 1)
            ).to.be.revertedWithCustomError(sovereignID, "SoulboundTransferForbidden");
        });

        it("revokeIdentity() should disable active flag", async () => {
            await sovereignID.connect(admin).revokeIdentity(volunteer.address);
            const identity = await sovereignID.getIdentity(volunteer.address);
            expect(identity.isActive).to.be.false;
        });
    });
});
