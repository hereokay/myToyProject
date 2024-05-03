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

  const response = await docClient.send(command);
  console.log(response);
  return response;
};


export const read = async (blocknumber,address) => {
    const command = new GetCommand({
      TableName: "my-simple-table",
      Key: {
        blocknumber:blocknumber,
        address:address,
      },
    });
  
    const response = await docClient.send(command);
    console.log(response);
    return response;
  };
  
  
