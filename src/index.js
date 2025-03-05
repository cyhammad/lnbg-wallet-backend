import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import walletRoutes from "./routes/walletRoutes.js"; // Add .js at the end

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/wallet", walletRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
