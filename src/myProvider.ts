import superagent from 'superagent';

export default class HttpProvider {

  public url: string

  public connector: any

  /**
   * @param url {string} - Full json rpc http url
   * @param [options] {object} - See `BaseProvider.constructor`
   * @return {HttpProvider}
   *
   * @example
   * > const provider = new HttpProvider('http://testnet-jsonrpc.conflux-chain.org:12537', {logger: console});
   */
  // eslint-disable-next-line no-useless-constructor
  constructor(url: string) {
    this.url = url;
  }

  /**
   * Gen a random json rpc id.
   * It is used in `call` method, overwrite it to gen your own id.
   *
   * @return {string}
   */
  public requestId() {
    return `${Date.now()}${Math.random().toFixed(7).substring(2)}`; // 13+7=20 int string
  }

  public close() { 
    console.log('close')
  }

  /**
   * Call a json rpc method with params
   *
   * @param method {string} - Json rpc method name.
   * @param [params] {array} - Json rpc method params.
   * @return {Promise<*>} Json rpc method return value.
   *
   * @example
   * > await provider.call('cfx_epochNumber');
   * > await provider.call('cfx_getBlockByHash', blockHash);
   */
  public async call(method: string, ...params: any): Promise<any> {
    const data = { jsonrpc: '2.0', id: this.requestId(), method, params };
    console.log(method, params);

    if (method === 'cfx_sendTransaction') {
      const customRequest = {
        id: this.requestId(),
        jsonrpc: "2.0",
        method,
        params,
      };

      console.log({customRequest})
      // sign typed data
      const signResult = await this.connector.sendCustomRequest(customRequest);
      return await this.call('cfx_sendRawTransaction', signResult);
    }

    let res: any = await superagent
      .post(this.url)
      .send(data);

    const wait = (time: number) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, time)
      })
    }

    if (res.body.result === null) {
      await wait(3000)
      res = await superagent
        .post(this.url)
        .send(data);
    }
    if (res.body.result === null) {
      await wait(3000)
      res = await superagent
        .post(this.url)
        .send(data);
    }
    if (res.body.result === null) {
      await wait(3000)
      res = await superagent
        .post(this.url)
        .send(data);
    }

    if (res.body.result) {
      return res.body.result
    } else {
      throw new Error(res.body.error)
    }
    // return result;
  }
}