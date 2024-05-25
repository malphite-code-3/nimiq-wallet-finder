const { NimiqWrapper } = require('nimiq-wrapper');

class Connection {
  connect = async () => new Promise(resolve => {
    const wrapper = new NimiqWrapper({
      consensusCallback: (status) => {
        if (status === 'established') {
          resolve(wrapper);
        }
      }
    });
    wrapper.initNode({ network: "MAIN" })
  })
}

module.exports = Connection;
