export interface AITool {
  /**
   * The name of the tool to be called by the model. Must be alphanumeric and underscores only.
   */
  name: string;

  /**
   * A detailed description of what the tool does and when to use it.
   */
  description: string;

  /**
   * JSON Schema representing the input parameters for the tool.
   * This should follow JSON Schema compatible with OpenAPI 3.0.
   */
  parameters: Record<string, any>;

  /**
   * The function to execute when the model calls this tool.
   * @param args The parsed arguments provided by the model.
   * @returns A promise that resolves to the result of the tool execution.
   */
  execute: (args: Record<string, any>) => Promise<any>;
}

export type AIToolset = AITool[];
