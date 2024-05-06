import express from 'express';
import axios from 'axios';
import { dbwrite, dbread } from './utils/dynamodb.js';
import 'dotenv/config';


const app = express();
const port = 3000;


// 10진수로 쓰기
async function handleData(blocknumber, address){

    try{
        const result = await dbread(blocknumber, address);
        if (result !== null){
            return result;
        }
    }
    catch (error){
        // TODO
        console.error("");
    }

    // result가 null 이거나 DB에서 조회할 수 없을 경우 -> API 호출
    const transactions = fetchTransactionsFromInfura(blocknumber,address);
    const [totalBalanceChange, totalFee] = extractTotal(transactions);
    
    // DB에 데이터를 저장한 후
    try{
        await dbwrite(blocknumber,address,totalBalanceChange,totalFee);
    }
    catch (error){
        // TODO
        
        console.error("");
    }

    // 값 리턴
    console.log(2)
    return [blocknumber,address,totalBalanceChange,totalFee];
}

async function fetchTransactionsFromInfura(blocknumber, address) {
    const url = "https://sepolia.infura.io/v3/" + process.env.API_KEY;
    const response = await axios.post(url, {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBlockByNumber",
        params: [blocknumber, true]
    });
    console.log(response)
    // TODO
    // 오류처리
    return response.data.result.transactions;
}

function extractTotal(transactions){
    let totalBalanceChange = BigInt(0);
    let totalFee = BigInt(0);

    for(let i=0;i<transactions.length;i++){
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
    return [totalBalanceChange, totalFee];
}

// http://localhost:3000/transactions?address=0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5&blocknumber=0x12dd669
// curl "http://localhost:3000/transactions?address=0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5&blocknumber=0x12dd669"
app.get('/transactions', async (req, res) => {
    const { address, blocknumber } = req.query;
    if (!address || !blocknumber) {
        return res.status(400).send('Both address and blocknumber are required');
    }

    const data = await handleData(blocknumber,address);

    // 
    try {        
        res.json({
            "balanceChange" : data[2],
            "fee": data[3],
        });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
