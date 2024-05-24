const { NimiqWrapper } = require('nimiq-wrapper');
const wrapper = new NimiqWrapper();

const connect = (cb) => {
  wrapper.initNode({
    network: "MAIN",
    whenReady: () => {
      cb(wrapper);
    }
  })
}

module.exports = connect;