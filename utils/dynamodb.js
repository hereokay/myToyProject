import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient,GetCommand } from "@aws-sdk/lib-dynamodb";
import 'dotenv/config';

// AWS 자격 증명과 리전 설정
const client = new DynamoDBClient({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,   
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, 
    }
});

const docClient = DynamoDBDocumentClient.from(client);



/**
 * DynamoDB에 특정 블록안에 특정 계정의 BalanceChange 와 Fee를 WRITE 
 *
 * @async
 * @param {decimal string} blocknumber
 * @param {lower hex string} address
 * @param {decimal string} totalBalanceChange
 * @param {decimal string} totalFee
 * @returns {[]} - 위 4개의 변수를 그대로 반환 or 에러 반환
 */
export const dbwrite = async (blocknumber,address,totalBalanceChange,totalFee,txCount) => {
    
    const command = new PutCommand({
        TableName: "my-simple-table",
        Item: {
            blocknumber: blocknumber,
            address: address,
            totalBalanceChange: totalBalanceChange,
            totalFee:totalFee,
            txCount:txCount,
        },
    });


    // 요청을 보내고 실패할 시 에러를 반환
    const response = await docClient.send(command);
    if (response.$metadata.httpStatusCode !== 200){
        throw new Error("AWS DynamoDB READ 요청 에러 발생");
    }

    // 그대로 반환
    return [blocknumber, address,totalBalanceChange,totalFee,txCount];
};



/**
 * (blocknumber, address)에 대해 기존에 저장된 balance 와 fee 정보를 조회
 *
 * @async
 * @param {decimal string} blocknumber
 * @param {lower hex string} address
 * @returns {[]} - blocknumber, address, totalbalanceChange, totalFee 를 배열로 반환, 없으면 에러 발생
 */
export const dbread = async (blocknumber,address) => {
    const command = new GetCommand({
      TableName: "my-simple-table",
      Key: {
            blocknumber:blocknumber,
            address:address,
        },
    });
  
    // 요청을 보내고 실패할 시 에러를 반환
    
    const response = await docClient.send(command);
    if (response.$metadata.httpStatusCode !== 200){
        console.log(response);
        throw new Error("AWS DynamoDB READ 요청 에러 발생");
    }
    
    // 존재하지 않을 경우 에러 반환
    if (response.Item === undefined){
        throw new Error("존재하지 않는 Item");
    }

    // 아이템이 있을 경우 해당 값을 반환
    return [response.Item.blocknumber, response.Item.address, response.Item.totalBalanceChange, response.Item.totalFee, response.Item.txCount];
};