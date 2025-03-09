import Web3 from "web3";
import axios from "axios";
import dotenv from "dotenv";
import validate from "bitcoin-address-validation";

dotenv.config();

const web3 = new Web3(
  new Web3.providers.HttpProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
  )
);

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

function isValidBitcoinAddress(address) {
  return validate(address);
}

export async function getBalance(address) {
  const balance = await web3.eth.getBalance(address);
  return web3.utils.fromWei(balance, "ether");
}

export async function getTransactions(address) {
  const API_URL = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;
  const response = await axios.get(API_URL);
  return response.data.result;
}

export async function getBalanceInUsd(address) {
  try {
    const balanceInEth = await getBalance(address);

    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
      {
        headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY },
        params: { symbol: "ETH", convert: "USD" },
      }
    );

    const ethPriceInUsd = response.data.data.ETH.quote.USD.price;
    const balanceInUsd = parseFloat(balanceInEth) * ethPriceInUsd;

    return { balance: balanceInEth, balanceUsd: balanceInUsd, currency: "USD" };
  } catch (error) {
    console.error("Error fetching balance in USD:", error);
    throw new Error("Failed to fetch balance in USD");
  }
}

export async function getBitcoinBalance(address) {
  try {
    // ✅ Check if the Bitcoin address is valid
    if (!isValidBitcoinAddress(address)) {
      throw new Error("Invalid Bitcoin address");
    }

    const API_URL = `https://blockstream.info/api/address/${address}`;
    const response = await axios.get(API_URL);

    if (!response.data.chain_stats) {
      throw new Error("Invalid response from API");
    }

    const balanceInSatoshis =
      response.data.chain_stats.funded_txo_sum -
      response.data.chain_stats.spent_txo_sum;
    const balanceInBtc = balanceInSatoshis / 1e8; // Convert Satoshis to BTC

    return balanceInBtc;
  } catch (error) {
    console.error("Error fetching Bitcoin balance:", error);
    throw new Error(error.message || "Failed to fetch Bitcoin balance");
  }
}

export async function getBitcoinBalanceInUsd(address) {
  try {
    if (!isValidBitcoinAddress(address)) {
      throw new Error("Invalid Bitcoin address");
    }

    const balanceInBtc = await getBitcoinBalance(address);

    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
      {
        headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY },
        params: { symbol: "BTC", convert: "USD" },
      }
    );

    const btcPriceInUsd = response.data.data.BTC.quote.USD.price;
    const balanceInUsd = balanceInBtc * btcPriceInUsd;

    return { balance: balanceInBtc, balanceUsd: balanceInUsd, currency: "USD" };
  } catch (error) {
    console.error("Error fetching Bitcoin balance in USD:", error);
    throw new Error(error.message || "Failed to fetch Bitcoin balance in USD");
  }
}

export async function getUserTokenBalances(userAddress, requestedTokens) {
  try {
    console.log("Fetching balances for:", userAddress, "Tokens:", requestedTokens);

    const tokenData = await getTokenDataFromCMC(requestedTokens);
    console.log("Token Data from CMC:", tokenData); // ✅ Debugging log

    let balances = {};

    for (const slug of requestedTokens) {
      if (!tokenData[slug]) {
        console.log(`Token ${slug} not found in CMC response`); // ✅ Log missing token
        continue;
      }

      const { id, symbol, platform, contract_address } = tokenData[slug];
      let balance = 0;

      if (!platform) {
        if (symbol === "ETH") {
          balance = await web3.eth.getBalance(userAddress);
          balance = web3.utils.fromWei(balance, "ether");
        } else if (symbol === "BTC") {
          balance = await getBitcoinBalance(userAddress); // Ensure this function works!
        }
      } else {
        // ERC-20 Token Handling
        try {
          const contract = new web3.eth.Contract(ERC20_ABI, contract_address);
          const rawBalance = await contract.methods.balanceOf(userAddress).call();
          const decimals = await contract.methods.decimals().call();
          balance = rawBalance / Math.pow(10, decimals);
        } catch (err) {
          console.error(`Error fetching ERC-20 balance for ${symbol}:`, err);
          continue; // Skip this token if there's an error
        }
      }

      const priceInUsd = tokenData[slug].price;
      const balanceInUsd = balance * priceInUsd;

      balances[slug] = {
        balance: parseFloat(balance),
        balanceInUsd: parseFloat(balanceInUsd),
      };
    }

    console.log("Final Balances:", balances); // ✅ Log final balances before returning
    return balances;
  } catch (error) {
    console.error("Error in getUserTokenBalances:", error);
    throw new Error("Failed to fetch balances.");
  }
}


/**
 * Fetch token details & prices from CoinMarketCap API.
 * @param {string[]} slugs - Array of token slugs (e.g., ["ethereum", "dogecoin"]).
 * @returns {Object} - Token data including ID, symbol, price, contract address.
 */
async function getTokenDataFromCMC(slugs) {
  try {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
      {
        headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY },
        params: { slug: slugs.join(","), convert: "USD" },
      }
    );

    const data = response.data.data;
    let tokenData = {};

    for (const key in data) {
      const coin = data[key];
      tokenData[coin.slug] = {
        id: coin.id,
        symbol: coin.symbol,
        price: coin.quote.USD.price,
        platform: coin.platform ? coin.platform.name : null,
        contract_address: coin.platform ? coin.platform.token_address : null,
      };
    }

    return tokenData;
  } catch (error) {
    console.error("Error fetching token data from CMC:", error);
    throw new Error("Failed to fetch token data.");
  }
}
