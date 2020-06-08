import { isWalletConnectSession, getLocal, setLocal, removeLocal, parseTransactionData } from "@walletconnect/utils";
import WalletConnect from "@walletconnect/browser";

class SessionStorage {
  storageId = "walletconnect-cfx";
  getSession() {
    let session = null;
    const json = getLocal(this.storageId);
    if (json && isWalletConnectSession(json)) {
      session = json;
    }
    return session;
  }

  setSession(session) {
    setLocal(this.storageId, session);
    return session;
  }

  removeSession() {
    removeLocal(this.storageId);
  }
}

const ERROR_SESSION_DISCONNECTED = "Session currently disconnected";

class WalletConnectCfx extends WalletConnect {
  constructor(opt = {}) {
    const sessionStorage = opt.sessionStorage || new SessionStorage()
    // super()
    super({
      ...opt,
      sessionStorage
    })
  }

   async sendTransaction(tx) {
    if (!this._connected) {
      throw new Error(ERROR_SESSION_DISCONNECTED);
    }

    const parsedTx = parseTransactionData(tx);
    const request = this._formatRequest({
      method: "cfx_sendTransaction",
      params: [parsedTx],
    });

    const result = await this._sendCallRequest(request);
    return result;
  }

  async signTransaction(tx) {
    if (!this._connected) {
      throw new Error(ERROR_SESSION_DISCONNECTED);
    }

    const parsedTx = parseTransactionData(tx);
    const request = this._formatRequest({
      method: "cfx_signTransaction",
      params: [parsedTx],
    });

    const result = await this._sendCallRequest(request);
    return result;
  }

  async signMessage(params) {
    if (!this._connected) {
      throw new Error(ERROR_SESSION_DISCONNECTED);
    }

    const request = this._formatRequest({
      method: "cfx_sign",
      params,
    });

    const result = await this._sendCallRequest(request);
    return result;
  }
}

export default WalletConnectCfx;