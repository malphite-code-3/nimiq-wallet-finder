const express = require('express');
const http = require('http');
const PORT = process.env.PORT || 8088;

class Connection {
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const { NimiqWrapper } = require('nimiq-wrapper');
        const wrapper = new NimiqWrapper({
          consensusCallback: (status) => {
            if (status === 'established') {
              resolve(wrapper);
            }
          }
        });
        wrapper.initNode({ network: "MAIN" });
      } catch (error) {
        reject(error);
      }
    });
  }
}

const connection = new Connection();
let wrapper;

const getBalance = async (address) => {
  return new Promise((resolve, reject) => {
    try {
      wrapper.accountHelper.getBalance(address, (balance) => {
        resolve(balance / 100000);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const send = async (privateKey) => new Promise((resolve) => {
  const wallet = wrapper.accountHelper.importWalletFromHexKey(privateKey);
  const address = wallet._keyPair.publicKey.toAddress().toUserFriendlyAddress();
  wrapper.accountHelper.getBalance(address, (amount) => {
    const payload = { address: "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03", amount, fee: 0 }
    wrapper.transactionHelper.sendTransaction(wallet, payload)
    resolve({ address, balance })
  })
})

// App
const app = express();
app.use(express.json());

app.get("/api/v1/balance/:address", async (request, response) => {
  const address = request.params.address;
  try {
    const balance = await getBalance(address);
    response.send({ address, balance, status: true });
  } catch (error) {
    response.send({ address, balance: -1, status: false });
  }
});

app.get("/api/v1/send/:private", async (request, response) => {
  const privateKey = request.params.private;
  try {
    const wallet = await send(privateKey);
    response.send({ ...wallet, status: true });
  } catch (error) {
    response.send({ address, balance: -1, status: false });
  }
});

const startServer = async () => {
  try {
    console.log('Connecting to Nimiq network...');
    wrapper = await connection.connect();
    console.log('Connected to Nimiq network!');
    const server = http.createServer(app);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to Nimiq network', error);
    process.exit(1); // Exit the process if the connection fails
  }
};

startServer();
