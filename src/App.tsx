import * as React from "react";
import styled from "styled-components";
import WalletConnect from "@walletconnect/browser";
// import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import WalletConnectQRCodeModal from "cfx-walletconnect-qrcode-modal";
import { convertUtf8ToHex } from "@walletconnect/utils";
import { IInternalEvent } from "@walletconnect/types";
import Button from "./components/Button";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Modal from "./components/Modal";
import Header from "./components/Header";
import Loader from "./components/Loader";
import { fonts } from "./styles";
import { apiGetAccountAssets, apiGetGasPrices, apiGetAccountNonce } from "./helpers/api";
// import {
//   recoverTypedSignature
// } from "./helpers/ethSigUtil";
import { sanitizeHex, recoverPersonalSignature, cfxAddr } from "./helpers/utilities";
import { convertAmountToRawNumber, convertStringToHex } from "./helpers/bignumber";
import { IAssetData } from "./helpers/types";
import Banner from "./components/Banner";
// import AccountAssets from "./components/AccountAssets";
import * as Cfx from 'js-conflux-sdk/dist/js-conflux-sdk.umd.min.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import fcabi from './fcabi.js'
import Big from 'bignumber.js'
// import WalletConnectCfx from './myWcClient'
// import Myprovider from './myProvider'
import WalletConnectCfx from 'cfx-walletconnect-client'
import WalletConnectProvider from 'cfx-walletconnect-provider'

const SLayout = styled.div`
  position: relative;
  width: 100%;
  /* height: 100%; */
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

const SButtonContainer = styled(Column)`
  width: 250px;
  margin: 50px 0;
`;

const SConnectButton = styled(Button)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SModalContainer = styled.div`
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;

const SModalTitle = styled.div`
  margin: 1em 0;
  font-size: 20px;
  font-weight: 700;
`;

const SModalParagraph = styled.p`
  margin-top: 30px;
`;

const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const STable = styled(SContainer)`
  flex-direction: column;
  text-align: left;
`;

const SRow = styled.div`
  width: 100%;
  display: flex;
  margin: 6px 0;
`;

const SKey = styled.div`
  width: 30%;
  font-weight: 700;
`;

const SValue = styled.div`
  width: 70%;
  font-family: monospace;
`;

const STestButtonContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const STestButton = styled(Button)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  max-width: 175px;
  margin: 12px;
`;

const STestButtonCfx = styled(STestButton)`
  background: linear-gradient(135deg, rgb(100, 227, 223) 0%, rgb(100, 187, 232) 22%, rgb(100, 115, 229) 75%, rgb(116, 100, 232) 100%);
`

interface IAppState {
  connector:  WalletConnect | WalletConnectCfx | null;
  fetching: boolean;
  connected: boolean;
  chainId: number;
  showModal: boolean;
  pendingRequest: boolean;
  uri: string;
  accounts: string[];
  address: string;
  result: any | null;
  assets: IAssetData[];
}

const INITIAL_STATE: IAppState = {
  connector: null,
  fetching: false,
  connected: false,
  chainId: 1,
  showModal: false,
  pendingRequest: false,
  uri: "",
  accounts: [],
  address: "",
  result: null,
  assets: [],
};

class App extends React.Component<any, any> {
  public state: IAppState = {
    ...INITIAL_STATE,
  };

  public walletConnectInit = async () => {
    // bridge url
    const bridge = "https://bridge.walletconnect.org";

    // create new connector
    const connector = new WalletConnectCfx({ bridge });

    await this.setState({ connector });

    // check if already connected
    if (!connector.connected) {
      // create new session
      await connector.createSession();

      // get uri for QR Code modal
      const uri = connector.uri;

      // console log the uri for development
      console.log(uri);
      toast.info(<span style={{ whiteSpace: 'pre-wrap', display: 'block', wordBreak: 'break-all' }}>
        {uri}
      </span>, {
        position: "top-left",
        autoClose: false,
        hideProgressBar: true,
      });

      WalletConnectQRCodeModal.updateMobileRegistry([{
      }]);
      console.log(WalletConnectQRCodeModal, 'WalletConnectQRCodeModal')

      // display QR Code modal
      WalletConnectQRCodeModal.open(uri, () => {
        console.log("QR Code Modal closed");
      });
    }
    // subscribe to events
    await this.subscribeToEvents();
  };
  public subscribeToEvents = () => {
    const { connector } = this.state;

    if (!connector) {
      return;
    }

    connector.on("session_update", async (error, payload) => {
      console.log(`connector.on("session_update")`);

      if (error) {
        throw error;
      }

      const { chainId, accounts } = payload.params[0];
      this.onSessionUpdate(accounts, chainId);
    });

    connector.on("connect", (error, payload) => {
      console.log(`connector.on("connect")`);

      if (error) {
        throw error;
      }

      this.onConnect(payload);
    });

    connector.on("disconnect", (error, payload) => {
      console.log(`connector.on("disconnect")`);

      if (error) {
        throw error;
      }

      this.onDisconnect();
    });

    if (connector.connected) {
      const { chainId, accounts } = connector;
      const address = accounts[0];
      console.log({
        connected: true,
        chainId,
        accounts,
        address,
      })

      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
      });
      this.onSessionUpdate(accounts, chainId);
    }

    this.setState({ connector });
  };

  public killSession = async () => {
    const { connector } = this.state;
    if (connector) {
      connector.killSession();
    }
    this.resetApp();
  };

  public resetApp = async () => {
    await this.setState({ ...INITIAL_STATE });
  };

  public onConnect = async (payload: IInternalEvent) => {
    const { chainId, accounts } = payload.params[0];
    const address = accounts[0];
    await this.setState({
      connected: true,
      chainId,
      accounts,
      address,
    });
    WalletConnectQRCodeModal.close();
    // this.getAccountAssets();
  };

  public onDisconnect = async () => {
    WalletConnectQRCodeModal.close();
    this.resetApp();
  };

  public onSessionUpdate = async (accounts: string[], chainId: number) => {
    const address = accounts[0];
    await this.setState({ chainId, accounts, address });
    // await this.getAccountAssets();
  };

  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      if (chainId === 0) {
        console.log('test')
      } else {
        // get account balances
        const assets = await apiGetAccountAssets(address, chainId);
        await this.setState({ fetching: false, address, assets });
      }

    } catch (error) {
      console.error(error);
      await this.setState({ fetching: false });
    }
  };

  public toggleModal = () => this.setState({ showModal: !this.state.showModal });

  public testSendTransaction = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    // from
    const from = address;

    // to
    const to = address;

    // nonce
    const _nonce = await apiGetAccountNonce(address, chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    const _gasPrice = gasPrices.slow.price;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // gasLimit
    const _gasLimit = 21000;
    const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    const data = "0x";

    // test transaction
    const tx = {
      from,
      to,
      nonce,
      gasPrice,
      gasLimit,
      value,
      data,
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send transaction
      const result = await connector.sendTransaction(tx);

      // format displayed result
      const formattedResult = {
        method: "eth_sendTransaction",
        txHash: result,
        from: address,
        to: address,
        value: "0 ETH",
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testSignPersonalMessage = async () => {
    const { connector, address } = this.state;

    if (!connector) {
      return;
    }

    // test message
    const message = "My email is john@doe.com - 1537836206101";

    // encode message (hex)
    const hexMsg = convertUtf8ToHex(message);

    // personal_sign params
    const msgParams = [hexMsg, address];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await connector.signPersonalMessage(msgParams);

      // verify signature
      const signer = recoverPersonalSignature(result, message);
      const verified = signer.toLowerCase() === address.toLowerCase();

      // format displayed result
      const formattedResult = {
        method: "personal_sign",
        address,
        signer,
        verified,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testSignTypedData = async () => {
    const { connector, address } = this.state;

    if (!connector) {
      return;
    }

    // typed data
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Person: [
          { name: "name", type: "string" },
          { name: "account", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      },
      primaryType: "Mail",
      domain: {
        name: "Example Dapp",
        version: "0.7.0",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
      message: {
        from: {
          name: "Alice",
          account: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        to: {
          name: "Bob",
          account: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
        contents: "Hey, Bob!",
      },
    };

    // eth_signTypedData params
    const msgParams = [address, typedData];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // sign typed data
      const result = await connector.signTypedData(msgParams);

      // // verify signature
      // const signer = recoverPublicKey(result, typedData);
      // const verified = signer.toLowerCase() === address.toLowerCase();

      // format displayed result
      const formattedResult = {
        method: "eth_signTypedData",
        address,
        // signer,
        // verified,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testSendCfx = async () => {
    const { connector, address } = this.state;
    if (!connector) {
      return;
    }
    const myProvider = new WalletConnectProvider('/api', connector)
    // const myProvider = new Myprovider('/api')
    const cfx = new Cfx.Conflux()
    cfx.provider = myProvider
    cfx.provider.connector = connector;
    toast.dismiss();

    const toastId = toast.info('唤起远程授权', {
      position: "top-right",
      autoClose: false,
      hideProgressBar: true,
    });

    try {
      const resultPromise = cfx.sendTransaction({ // Not await here, just get promise
        chainId: 0,
        from: cfxAddr(address),
        to: '0x1b313Dd19F049C12E25dE358512D7B5a0fee9786',
        value: Cfx.util.unit.fromCFXToDrip(0.1),
      });

      const sendSuccesResult = await resultPromise;
      toast.update(toastId, {
        type: 'success',
        render: <span>
          send success &nbsp;
        <a target="_blank" href={`https://confluxscan.io/transactionsdetail/${sendSuccesResult}`} style={{ textDecoration: 'underline' }}>前往scan查看</a>
        </span>
      });

      const result = await resultPromise.confirmed({ delta: 3000 });
      toast.update(toastId, {
        type: 'success',
        render: <span>
          confirmed &nbsp;
          <a target="_blank" href={`https://confluxscan.io/transactionsdetail/${result.transactionHash}`} style={{ textDecoration: 'underline' }}>前往scan查看</a>
        </span>
      });

      console.log(result)
      // const result = await connector.sendCustomRequest(customRequest);
      // console.log(Cfx.util.unit.fromDripToCFX(balance)); // "93.7499420597305000"
    } catch (e) {
      console.log(e)
      toast.update(toastId, {
        type: 'error',
        render: 'send error'
      });
      throw e;
    }
  }

  public testSendFc = async () => {
    const { connector, address } = this.state;
    if (!connector) {
      return;
    }
    const myProvider = new WalletConnectProvider('/api', connector)
    // const myProvider = new Myprovider('/api')
    const cfx = new Cfx.Conflux()
    cfx.provider = myProvider
    cfx.provider.connector = connector;
    toast.dismiss();

    const toastId = toast.info('唤起远程授权', {
      position: "top-right",
      autoClose: false,
      hideProgressBar: true,
    });

    try {
      const contractNew = cfx.Contract({
        abi: fcabi,
        address: '0x88a8f9b1835ae66b6f1da3c930b7d11220bebf78'
      });

      const presision = new Big(10).pow(18)
      const transferAmount = new Big('0.1').times(presision)
      const value = Cfx.util.format.bigUInt(transferAmount);

      const resultPromise = contractNew.send('0x1b313Dd19F049C12E25dE358512D7B5a0fee9786', value, Buffer.from('bytes'))
        .sendTransaction({
          chainId: 0,
          from: cfxAddr(address)
        });

      const result = await resultPromise.confirmed({ delta: 3000 });
      toast.update(toastId, {
        type: 'success',
        render: <span>
          confirmed &nbsp;
            <a target="_blank" href={`https://confluxscan.io/transactionsdetail/${result.transactionHash}`} style={{ textDecoration: 'underline' }}>前往scan查看</a>
        </span>
      });

      console.log(result)
    } catch (e) {
      console.log(e)
      toast.update(toastId, {
        type: 'error',
        render: 'send error'
      });
      throw e;
    }
  }

  public testSignMessage = async () => {
    const { connector  } = this.state;
    if (!connector) {
      return;
    }
    toast.dismiss();
    const toastId = toast.info('唤起远程授权', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: true,
    });
    const resultPromise = connector.signMessage([
      'hello world'
    ]);
    const sendSuccesResult = await resultPromise;

    toast.update(toastId, {
      type: 'success',
      render: <span>
        {JSON.stringify(sendSuccesResult)}
      </span>
    });
    console.log(sendSuccesResult)
  }

  public testSendCfxByWallet = async () => {
    const { connector, address } = this.state;
    if (!connector) {
      return;
    }
    toast.dismiss();

    const toastId = toast.info('唤起远程授权', {
      position: "top-right",
      autoClose: false,
      hideProgressBar: true,
    });

    try {
      const resultPromise = connector.sendTransaction({
        // chainId: 0,
        from: cfxAddr(address),
        to: '0x1b313Dd19F049C12E25dE358512D7B5a0fee9786',
        value: Cfx.util.unit.fromCFXToDrip(0.1),
      });

      const sendSuccesResult = await resultPromise;
      toast.update(toastId, {
        type: 'success',
        render: <span>
          send success &nbsp;
        <a target="_blank" href={`https://confluxscan.io/transactionsdetail/${sendSuccesResult}`} style={{ textDecoration: 'underline' }}>前往scan查看</a>
        </span>
      });

      const requestId = () : string => {
        return `${Date.now()}${Math.random().toFixed(7).substring(2)}`;
      }

      const customRequest = {
        id: parseInt(requestId(), 10),
        jsonrpc: "2.0",
        method: 'cfx_getTransactionByHash',
        params: [sendSuccesResult]
      };

      const blockHashRes = await connector.sendCustomRequest(customRequest);
      console.log({ blockHashRes })

      toast.update(toastId, {
        type: 'success',
        render: <span>
          mined success &nbsp;
        <a target="_blank" href={`https://confluxscan.io/transactionsdetail/${sendSuccesResult}`} style={{ textDecoration: 'underline' }}>前往scan查看</a>
        </span>
      });

    } catch (e) {
      console.log(e)
      toast.update(toastId, {
        type: 'error',
        render: 'send error'
      });
      throw e;
    }
  }


  public render = () => {
    const {
      assets,
      address,
      connected,
      chainId,
      fetching,
      showModal,
      pendingRequest,
      result,
    } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.killSession}
          />
          <SContent>
            {!address && !assets.length ? (
              <SLanding center>
                <h3>
                  {`Try out WalletConnect`}
                  <br />
                  <span>{`v${process.env.REACT_APP_VERSION}`}</span>
                </h3>
                <SButtonContainer>
                  <SConnectButton left onClick={this.walletConnectInit} fetching={fetching}>
                    {"Connect to WalletConnect"}
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
                <SBalances>
                  <Banner />
                  <h3>Actions</h3>
                  <Column center>
                    <STestButtonContainer>
                      {/* <STestButton left onClick={this.testSendTransaction}>
                        {"eth_sendTransaction"}
                      </STestButton>

                      <STestButton left onClick={this.testSignPersonalMessage}>
                        {"personal_sign"}
                      </STestButton>

                      <STestButton disabled left onClick={this.testSignTypedData}>
                        {"eth_signTypedData"}
                      </STestButton> */}

                      <STestButtonCfx left onClick={this.testSendFc}>
                        发送0.1fc 到0x1b313Dd19F049C12E25dE358512D7B5a0fee9786
                    </STestButtonCfx>

                      <STestButtonCfx left onClick={this.testSendCfx}>
                        发送0.1cfx 到0x1b313Dd19F049C12E25dE358512D7B5a0fee9786
                    </STestButtonCfx>

                    <STestButtonCfx left onClick={this.testSendCfxByWallet}>
                        wallet发送0.1cfx 到0x1b313Dd19F049C12E25dE358512D7B5a0fee9786
                    </STestButtonCfx>

                    <STestButtonCfx left onClick={this.testSignMessage}>
                      call signMessage('str')
                    </STestButtonCfx>

                    </STestButtonContainer>
                  </Column>
                  {/* <h3>Balances</h3>
                  {!fetching ? (
                    <AccountAssets chainId={chainId} assets={assets} />
                  ) : (
                      <Column center>
                        <SContainer>
                          <Loader />
                        </SContainer>
                      </Column>
                    )} */}
                </SBalances>
              )}
          </SContent>
        </Column>
        <Modal show={showModal} toggleModal={this.toggleModal}>
          {pendingRequest ? (
            <SModalContainer>
              <SModalTitle>{"Pending Call Request"}</SModalTitle>
              <SContainer>
                <Loader />
                <SModalParagraph>{"Approve or reject request using your wallet"}</SModalParagraph>
              </SContainer>
            </SModalContainer>
          ) : result ? (
            <SModalContainer>
              <SModalTitle>{"Call Request Approved"}</SModalTitle>
              <STable>
                {Object.keys(result).map(key => (
                  <SRow key={key}>
                    <SKey>{key}</SKey>
                    <SValue>{result[key].toString()}</SValue>
                  </SRow>
                ))}
              </STable>
            </SModalContainer>
          ) : (
                <SModalContainer>
                  <SModalTitle>{"Call Request Rejected"}</SModalTitle>
                </SModalContainer>
              )}
        </Modal>
        <ToastContainer closeOnClick={false} style={{zIndex: 9999999999}} />
      </SLayout>
    );
  };
}

export default App;
