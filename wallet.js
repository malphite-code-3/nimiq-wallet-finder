const NimiqWallet = require('nimiqscan-wallet').default;
const EdDSA = require('elliptic').eddsa
const ec = new EdDSA('ed25519')

const Wallet = {
  fromPrivateKey: function(privateKeyHex) {
    const publicKeyArray = ec.keyFromSecret(privateKeyHex).getPublic()
    const publicKeyHex = Buffer.from(publicKeyArray).toString('hex')
    return NimiqWallet.fromMasterKey(privateKeyHex + publicKeyHex)
  }
}

module.exports = Wallet;
