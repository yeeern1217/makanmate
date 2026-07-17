import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { CapturedCard } from "@/types/card";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const doc = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.DDB_USERS_TABLE || "makanmate_users";
const CARDS_TABLE = process.env.DDB_CARDS_TABLE || "makanmate_cards";

export interface UserRecord {
  userId: string;
  createdAt: string;
  nickname?: string;
}

export async function ensureUser(userId: string, nickname?: string): Promise<void> {
  const existing = await doc.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
  if (existing.Item) return;
  await doc.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: { userId, createdAt: new Date().toISOString(), nickname: nickname ?? null },
    })
  );
}

export async function saveCard(userId: string, card: CapturedCard): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: CARDS_TABLE,
      Item: { userId, cardId: card.id, card },
    })
  );
}

export async function listCards(userId: string): Promise<CapturedCard[]> {
  const res = await doc.send(
    new QueryCommand({
      TableName: CARDS_TABLE,
      KeyConditionExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId },
    })
  );
  return (res.Items ?? []).map((item) => item.card as CapturedCard);
}
