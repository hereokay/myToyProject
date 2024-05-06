import express from 'express';
import axios from 'axios';
import { dbwrite, dbread } from './utils/dynamodb.js';
import 'dotenv/config';


const app = express();
const port = 3000;


// 16진수로 쓰기
async function handleData(blocknumber, address){

    try{
        const result = await dbread(blocknumber, address);
        if (result !== null){
            return result;
        }
    }
    catch (error){
        // TODO
        console.error("DBREAD 중 오류");
        process.exit();
    }

    // result가 null 이거나 DB에서 조회할 수 없을 경우 -> API 호출
    const transactions = await fetchTransactionsFromInfura(blocknumber,address);
    const [totalBalanceChange, totalFee] = extractTotal(transactions,address);
    
    // DB에 데이터를 저장하되 결과를 기다리지 않음
    dbwrite(blocknumber, address, totalBalanceChange, totalFee).then(() => {
        console.log("Data saved successfully");
    }).catch(error => {
        console.error("DB WRITE 중 오류", error);
    });

    return [blocknumber,address,totalBalanceChange,totalFee];
}

async function fetchTransactionsFromInfura(blocknumber, address) {
    const url = "https://mainnet.infura.io/v3/" + process.env.API_KEY;
    const response = await axios.post(url, {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBlockByNumber",
        params: [blocknumber, true]
    });
    
    if(response.data.result === undefined){
        console.error("INFURA API 호출중 오류");
        process.exit(0);
    }

    return response.data.result.transactions;
}

function extractTotal(transactions,address){
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
        }
        // 입금내역
        else if(tx.to == address.toLowerCase()){
            totalBalanceChange += BigInt(tx.value);
            const fee = BigInt(tx.gas) * BigInt(tx.gasPrice);
            totalFee += fee;
            
        }
    }
    return [totalBalanceChange.toString(16), totalFee.toString(16)];
}


app.get('/transactions', async (req, res) => {
    const { address, blocknumber } = req.query;
    if (!address || !blocknumber) {
        return res.status(400).send('blocknumber and address 를 입력해주세요');
    }

    const regex = /^0x[0-9a-f]+$/;

    if (!(regex.test(address) && regex.test(blocknumber))) {
        res.status(400).json({ error: "address 또는 blocknumber의 문자열 형식이 올바르지 않습니다." });
        return ;
    }

    const data = await handleData(blocknumber,address);

    try {
        res.json({
            "balanceChange" : "0x"+ data[2].toString(16),
            "fee": "0x"+data[3].toString(16),
        });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

