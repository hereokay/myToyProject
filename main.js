import express from 'express';
import { dbwrite, dbread } from './utils/dynamodb.js';
import { fetchTransactionsFromInfura } from './utils/infura.js';
import 'dotenv/config';



const app = express();
const port = 3000;



// 16진수 문자열을 리턴
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
        console.error(error);
        return null;
        //process.exit();
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

app.get('/health', async (req,res) => {
    res.status(200).send("OK");
});

app.get('/transactions', async (req, res) => {
    const { address, blocknumber } = req.query;
    if (!address || !blocknumber) {
        return res.status(400).send('blocknumber and address 를 입력해주세요');
    }

    const addressRegex = /^0x[0-9a-fA-F]+$/ ;
    const blocknumberRegex = /^[0-9]+$/ ;

    if (!(addressRegex.test(address) && blocknumberRegex.test(blocknumber))) {
        res.status(400).json({ error: "address 또는 blocknumber의 문자열 형식이 올바르지 않습니다." });
        return ;
    }



    const data = await handleData(blocknumber,address);
    if (data===null){
        return;
    }

    try {
        res.json({
            "balanceChange" : "0x"+ data[2],
            "fee": "0x"+data[3],
        });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});



export {handleData, extractTotal, app};