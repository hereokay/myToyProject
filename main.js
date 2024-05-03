require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// http://localhost:3000/transactions?address=0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5&blockNumber=0x12dd669
// curl "http://localhost:3000/transactions?address=0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5&blockNumber=0x12dd669"
app.get('/transactions', async (req, res) => {
    const { address, blockNumber } = req.query;
    if (!address || !blockNumber) {
        return res.status(400).send('Both address and blockNumber are required');
    }

    const url = `https://mainnet.infura.io/v3/${process.env.API_KEY}`;

    try {
        const response = await axios.post(url, {
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getBlockByNumber",
            params: [blockNumber, true]
        });
        
        const transactions = response.data.result.transactions;
        let totalBalanceChange = BigInt(0);
        let totalFee = BigInt(0);

        for(i=0;i<transactions.length;i++){

            const tx = transactions[i];
            
            // 출금 또는 컨트랙트 내역
            // from, to 가 같을경우 출금내역에 등록
            if(tx.from == address.toLowerCase()){
                totalBalanceChange -= BigInt(tx.value);
                const fee = BigInt(tx.gas) * BigInt(tx.gasPrice);
                totalFee += fee;
                console.log(tx);
            }
            // 입금내역
            else if(tx.to == address.toLowerCase()){
                totalBalanceChange += BigInt(tx.value);
                const fee = BigInt(tx.gas) * BigInt(tx.gasPrice);
                totalFee += fee;
                console.log(tx);
            }
        
        }

        res.json({
            "balanceChange" : totalBalanceChange.toString(10),
            "fee": totalFee.toString(10),
        });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
