import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient,GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const write = async (blocknumber,address,totalBalanceChange,totalFee) => {
    
    const command = new PutCommand({
        TableName: "my-simple-table",
        Item: {
            blocknumber: blocknumber,
            address: address,
            totalBalanceChange: totalBalanceChange,
            totalFee:totalFee,
        },
    });


    // 요청을 보내고 실패할 시 에러를 반환
    const response = await docClient.send(command);
    if (response.$metadata.httpStatusCode !== 200){
        throw new Error("AWS DynamoDB READ 요청 에러 발생");
    }

    // 그대로 반환
    return [blocknumber, address,totalBalanceChange,totalFee];
};


export const read = async (blocknumber,address) => {
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
        throw new Error("AWS DynamoDB READ 요청 에러 발생");
    }
    
    // 존재하지 않을 경우 null을 반환
    if (response.Item === undefined){
        return null;
    }


    // 아이템이 있을 경우 해당 값을 반환
    return [response.Item.blocknumber, response.Item.address, response.Item.totalBalanceChange, response.Item.totalFee];
};