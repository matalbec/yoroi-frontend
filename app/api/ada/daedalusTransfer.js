// @flow

// Handle data created by wallets using the v1 address scheme

import BigNumber from 'bignumber.js';
import _ from 'lodash';
import {
  Logger,
  stringifyError,
} from '../../utils/logging';
import { LOVELACES_PER_ADA } from '../../config/numbersConfig';
import {
  GetAddressesWithFundsError,
  NoInputsError,
  GenerateTransferTxError
} from './errors';
import {
  addTxInputs,
  addOutput,
  getAllUTXOsForAddresses,
  utxoToTxInput
} from './adaTransactions/adaNewTransactions';
import type {
  TransferTx
} from '../../types/TransferTypes';
import { getReceiverAddress } from './adaAddress';
import { RustModule } from './lib/cardanoCrypto/rustLoader';

import type { ConfigType } from '../../../config/config-types';

declare var CONFIG : ConfigType;
const protocolMagic = CONFIG.network.protocolMagic;

type AddressKeyMap = { [addr: string]: RustModule.Wallet.PrivateKey };

/** Go through the whole UTXO and see which belong to the walet and have non-empty balance
 * @param fullUtxo the full utxo of the Cardano blockchain
 */
export function getAddressesWithFunds(payload: {
  checker: RustModule.Wallet.DaedalusAddressChecker,
  fullUtxo: Array<string>
}): AddressKeyMap {
  try {
    const { checker, fullUtxo } = payload;

    const addrKeyMap = {};
    for (const addr of fullUtxo) {
      const rustAddr = RustModule.Wallet.Address.from_base58(addr);
      const checkedAddr = checker.check_address(rustAddr);
      if (!checkedAddr.is_checked()) {
        addrKeyMap[addr] = checkedAddr.private_key();
      }
    }
    return addrKeyMap;
  } catch (error) {
    Logger.error(`daedalusTransfer::getAddressesWithFunds ${stringifyError(error)}`);
    throw new GetAddressesWithFundsError();
  }
}

/** Generate transaction including all addresses with no change */
export async function generateTransferTx(payload: {
  addressesWithFunds: AddressKeyMap
}): Promise<TransferTx> {
  try {
    const { addressesWithFunds } = payload;

    // fetch data to make transaction
    const senders = Object.keys(addressesWithFunds);
    const senderUtxos = await getAllUTXOsForAddresses(senders);
    if (_.isEmpty(senderUtxos)) {
      throw new NoInputsError();
    }
    const inputs = utxoToTxInput(senderUtxos);

    // pick which address to send transfer to
    const outputAddr = await getReceiverAddress();
    const feeAlgorithm = RustModule.Wallet.LinearFeeAlgorithm.default();

    // firts build a transaction to see what the cost would be
    const fakeTxBuilder = new RustModule.Wallet.TransactionBuilder();
    addTxInputs(fakeTxBuilder, inputs);
    const inputAmount = new BigNumber(
      fakeTxBuilder.get_input_total().to_str()
    ).times(LOVELACES_PER_ADA);
    addOutput(fakeTxBuilder, outputAddr, inputAmount.toString());
    const fee = new BigNumber(
      fakeTxBuilder.estimate_fee(feeAlgorithm).to_str()
    ).times(LOVELACES_PER_ADA);

    // now build the real transaction with the fees taken into account
    const realTxBuilder = new RustModule.Wallet.TransactionBuilder();
    addTxInputs(realTxBuilder, inputs);
    const sendAmount = inputAmount.minus(fee.toString());
    addOutput(realTxBuilder, outputAddr, sendAmount.toString());

    // sanity check
    const balance = realTxBuilder.get_balance(feeAlgorithm);
    if (!balance.is_zero()) {
      throw new GenerateTransferTxError();
    }

    // sign inputs
    const txFinalizer = new RustModule.Wallet.TransactionFinalized(
      realTxBuilder.make_transaction()
    );
    const setting = RustModule.Wallet.BlockchainSettings.from_json({
      protocol_magic: protocolMagic
    });
    for (let i = 0; i < senderUtxos.length; i++) {
      const witness = RustModule.Wallet.Witness.new_extended_key(
        setting,
        addressesWithFunds[senderUtxos[i].receiver],
        txFinalizer.id()
      );
      txFinalizer.add_witness(witness);
    }

    const signedTx = txFinalizer.finalize();

    // return summary of transaction
    return {
      recoveredBalance: inputAmount.dividedBy(LOVELACES_PER_ADA),
      fee: fee.dividedBy(LOVELACES_PER_ADA),
      signedTx,
      senders,
      receiver: outputAddr,
    };
  } catch (error) {
    Logger.error(`daedalusTransfer::generateTransferTx ${stringifyError(error)}`);
    if (error instanceof NoInputsError) {
      throw error;
    }
    throw new GenerateTransferTxError();
  }
}
