import express, { query } from 'express';
import { dbwrite, dbread } from './utils/dynamodb.js';
import { fetchTransactionsFromInfura } from './utils/infura.js';
import 'dotenv/config';



// Express 서버 사용, 포트 80
const app = express();
const port = 80;


/**
 * blocknumber 와 address 를 통해 balanceChange와 Fee를 얻는 함수
 *
 * @async
 * @param {lower hex string} blocknumber - 조회할 블록넘버
 * @param {lower hex string} address - 조회할 주소
 * @returns {[]} - 4개 값을 담은 배열을 반환
 *  - blocknumber(decimal string)
 *  - address(lower hex string)
 *  - totalBalanceChange(decimal string)
 *  - totalFee(decimal string)
 */
async function handleData(blocknumber, address){

    try{
        // result가 존재하는 경우
        const result = await dbread(blocknumber, address);
        return result;
    }
    catch (error){
        switch(error.message){
            case '존재하지 않는 Item':
                break;
            default:
                console.error("DB READ Error :"+error.message);
                throw error;
        }
    }

    let transactions;

    // DB에서 조회할 수 없을 경우 -> API 호출
    try{
        transactions = await fetchTransactionsFromInfura(blocknumber,address);
    }
    catch (error){
        throw error;
    }
    
    const [totalBalanceChange, totalFee] = extractTotal(transactions,address);
    
    // DB에 데이터를 저장하되 결과를 기다리지 않음
    dbwrite(blocknumber, address, totalBalanceChange, totalFee).then(() => {
        console.log("Data saved successfully");
    }).catch(error => {
        console.error("DB WRITE 중 오류", error);
    });

    return [blocknumber,address,totalBalanceChange,totalFee];
}


/**
 * 쿼리 파라미터가 정상 형식인지 판단하는 함수
 * 
 * @param {json} query - 쿼리 파라미터의 JSON
 * @returns {boolean} - 정상적인 형식이라면 true 반환
 */
function isValidQueryParameters(query){
    const { address, blocknumber } = query;
    if (!address || !blocknumber) {
        return false;
    }

    const addressRegex = /^0x[0-9a-fA-F]+$/ ; // 0x1234 와 같은 hex string
    const blocknumberRegex = /^[0-9]+$/ ; // 1235 와 같은 decimal string

    if (!(addressRegex.test(address) && blocknumberRegex.test(blocknumber))) {
        return false;
    }
    
    return true;
}


/**
 * transaction list 안에 해당 address에 대한 BalanceChange와 Fee를 구하는 함수
 *
 * @param {transaction list} transactions
 * @param {lower hex string} address
 * @returns {[]} - totalBalanceChange 와 totalFee 두개를 배열로 담아서 리턴
 * - totalBalanceChange(decimal string, 음수 가능)
 * - totalFee(decimal string, 음수 가능)
 */
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
    
    return [divideByETH(totalBalanceChange.toString(10)), divideByETH(totalFee.toString(10))];
}

// 노드 서버가 살아있는지 확인하는 GET 메서드 핸들러
app.get('/health', async (req,res) => {
    res.status(200).send("OK");
});


// blocknumber 와 address를 통해 balanceChange와 Fee를 구하는 GET 메서드 핸들러
app.get('/oneBlock', async (req, res) => {

    if(!isValidQueryParameters(req.query)){
        res.status(400).json({ error: "address 또는 blocknumber의 문자열 형식이 올바르지 않습니다." });
        return;
    }
    
    const address = req.query.address.toLowerCase(); // lower hex string
    const decimalNumber = parseInt(req.query.blocknumber, 10); 
    const blocknumber = "0x" + decimalNumber.toString(16); // lower hex string
    
    try{
        const data = await handleData(blocknumber,address);
        res.json({
            "balanceChange" : data[2],
            "fee": data[3],
        });
        return;
    }
    catch (error) {
        console.error(error.toString());
        res.status(500).json({ error: error.toString() });
        return;
    }
});

function divideByETH(decimalString) {
    
    // ETH to wei 10^x unit
    const decimalPlaces = 18;


    let absString = decimalString;

    // 음수이면 - 제거
    const isNegative = absString[0] === '-';
    if (isNegative) {
        absString = absString.substring(1);
    }

    // 나눈후 앞에 0이 필요한 경우 추가
    while (absString.length <= decimalPlaces) {
        absString = '0' + absString;
    }

    // 소숫점 삽입
    const index = absString.length - decimalPlaces;
    const resultString = absString.substring(0, index) + '.' + absString.substring(index);

    // 맨뒤 불필요한 0 제거
    const trimmedResult = (isNegative ? '-' : '') + parseFloat(resultString).toString();

    return trimmedResult;
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});



export {handleData, extractTotal, app};


// https://gv07ocff6a.execute-api.ap-northeast-2.amazonaws.com/transactions?blocknumber=19839288&address=0x7c195D981AbFdC3DDecd2ca0Fed0958430488e34