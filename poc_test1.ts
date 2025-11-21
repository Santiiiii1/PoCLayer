//
// PoC Test 1 - Unauthorized Config Change Attempt
// Demuestra si un atacante C puede modificar la conexión A→B.
//
// Dependencias sugeridas:
//   npm i @ton/core @ton/ton tonweb
//

import { Address, beginCell, toNano } from "@ton/core";
import { TonClient, WalletContractV4 } from "@ton/ton";

// ---------------------------------------------
// CONFIG - RELLENA TUS DATOS
// ---------------------------------------------

const RPC = "https://toncenter.com/api/v2/jsonRPC";

const attackerSeed = "PALABRAS SEMILLA DEPREDADOR (C)";
const legitSeed    = "SEMILLA DEL DUEÑO REAL (A)"; // opcional, para comparar

const managerAddress = Address.parse("UB...");        // ulnManager real
const dstOApp        = Address.parse("UB...");        // destino "B"
const eid            = 30102;                         // ejemplo EID
const newConfigValue = 99999;                         // lo que intentamos setear

// ---------------------------------------------
// UTIL
// ---------------------------------------------
async function openWallet(client: TonClient, seed: string) {
    const key = await client.mnemonicToPrivateKey(seed.split(" "));
    return WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
}

// ---------------------------------------------
// POC
// ---------------------------------------------
async function main() {

    const client = new TonClient({ endpoint: RPC });

    const attackerWallet = await openWallet(client, attackerSeed);

    console.log("Attacker address:", attackerWallet.address.toString());

    // 1. Attacker despliega su conexión maliciosa C→B
    const deployPayload = beginCell()
        .storeUint(1, 32)  // opcode ficticio según ABI real (ajusta según ABI exacto)
        .storeUint(eid, 32)
        .storeAddress(dstOApp)
        .endCell();

    console.log(">> Enviando deployUlnConnection C→B...");
    await attackerWallet.sendTransfer({
        to: managerAddress,
        value: toNano("0.1"),
        body: deployPayload,
    });

    console.log("Deploy enviado. Ahora intentar modificar conexión A→B...");

    // 2. Attacker intenta modificar la config de A→B
    //    Esto debe fallar por _assertOAppPath
    const modifyPayload = beginCell()
        .storeUint(2, 32)   // opcode SET_OAPP_ULN_SEND_CONFIG (reemplazar con el real)
        .storeUint(eid, 32)
        .storeAddress(Address.parse("UB...ADDRESS DE A..."))  // srcOApp original A
        .storeAddress(dstOApp)                                // dstOApp B
        .storeUint(newConfigValue, 32)
        .endCell();

    try {
        console.log(">> Intentando modificar A→B como C (debe fallar)...");
        await attackerWallet.sendTransfer({
            to: managerAddress,
            value: toNano("0.05"),
            body: modifyPayload,
        });

        console.log("❌ ERROR: La transacción NO falló.");
        console.log("Esto significaría que el bug ES REAL y crítico.");

    } catch (err) {
        console.log("✅ Revert esperado: atacante NO puede modificar A→B");
        console.log("Motivo:", err.message);
    }
}

main();
