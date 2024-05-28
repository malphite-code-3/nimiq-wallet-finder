const connect = (cb) => {
  const { NimiqWrapper } = require('nimiq-wrapper');
  const wrapper = new NimiqWrapper({
    consensusCallback: (status) => {
      if (status === 'established'){
        cb(wrapper);
      }
    }
  });
  wrapper.initNode({ network: "MAIN" });
}

module.exports = connect;
