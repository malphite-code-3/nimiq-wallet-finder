const argv = require('minimist')(process.argv.slice(2));
const address = argv?.a || null;
if (!address) {
  console.error('Address is not found!');
  return;
}

const { NimiqWrapper } = require('nimiq-wrapper');
const run = () => {
  const wrapper = new NimiqWrapper();
  wrapper.initNode({
    network: "MAIN",
    whenReady: () => {
      wrapper.accountHelper.getBalance(address, (b) => {
        const balance = b / 100000;
        console.log(`${address}: ${balance} NIM`);
        process.exit(0)
      })
    }
  })

}

run();