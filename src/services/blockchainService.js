import Web3 from "web3";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const web3 = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`));

export async function getBalance(address) {
  const balance = await web3.eth.getBalance(address);
  return web3.utils.fromWei(balance, "ether");
}

export async function getTransactions(address) {
  const API_URL = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;
  const response = await axios.get(API_URL);
  return response.data.result;
}
