import express from "express";
import {
  getBalance,
  getBalanceInUsd,
  getTransactions,
  getBitcoinBalance,
  getBitcoinBalanceInUsd,
  getUserTokenBalances,
} from "../services/blockchainService.js";

const router = express.Router();

router.get("/:address/balance", async (req, res) => {
  try {
    const balance = await getBalance(req.params.address);
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:address/transactions", async (req, res) => {
  try {
    const transactions = await getTransactions(req.params.address);
    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:address/balance-usd", async (req, res) => {
  try {
    const result = await getBalanceInUsd(req.params.address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ New route: Get Bitcoin balance in BTC
router.get("/:address/bitcoin-balance", async (req, res) => {
  try {
    const balance = await getBitcoinBalance(req.params.address);
    res.json({ balance, currency: "BTC" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ New route: Get Bitcoin balance in BTC & USD
router.get("/:address/bitcoin-balance-usd", async (req, res) => {
  try {
    const result = await getBitcoinBalanceInUsd(req.params.address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:address/token-balances", async (req, res) => {
  try {
    const userAddress = req.params.address;
    const requestedTokens = req.body.tokens; // Expecting an array like ["ethereum", "dogecoin"]

    console.log("Received tokens:", requestedTokens); // ✅ Debugging log

    if (!Array.isArray(requestedTokens) || requestedTokens.length === 0) {
      return res.status(400).json({ error: "Invalid token list. Must be a non-empty array." });
    }

    const balances = await getUserTokenBalances(userAddress, requestedTokens);
    res.json(balances);
  } catch (error) {
    console.error("Error in token balance route:", error);
    res.status(500).json({ error: error.message });
  }
});


export default router;
