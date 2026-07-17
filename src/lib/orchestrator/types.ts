export interface AgentResult {
  action: string;
  result: unknown;
  durationMs: number;
  fallbackUsed?: boolean;
  error?: boolean;
}
