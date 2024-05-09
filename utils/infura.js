import 'dotenv/config';
import axios from 'axios';


// blocknumber : 10진수 
// address : 0x123 .. 16진수
export const fetchTransactionsFromInfura = async (blocknumber, address) => {

    
    const url = "https://mainnet.infura.io/v3/" + process.env.API_KEY;
    const response = await axios.post(url, {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBlockByNumber",
        params: [blocknumber, true]
    });

    
    if(response.data.result === null){
        throw new Error("INFURA API 호출중 에러");
    }

    return response.data.result.transactions;
}
