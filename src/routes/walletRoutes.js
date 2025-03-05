import express from "express";
import { getBalance, getTransactions } from "../services/blockchainService.js";

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

export default router;
