declare module "@google/genai" {
  export interface GenerateContentResponse {
    // The raw text the SDK returns for simple responses
    text?: string;
    // Optional metadata container for other response fields
    [key: string]: any;
  }

  export interface GenerateContentOptions {
    model: string;
    contents: any;
    config?: any;
  }

  export interface ModelInfo {
    name: string;
    [key: string]: any;
  }

  export interface Pager<T> {
    models: T[];
    [key: string]: any;
  }

  export class Models {
    generateContent(opts: GenerateContentOptions): Promise<GenerateContentResponse>;
    list(): Promise<Pager<ModelInfo>>;
  }

  export class GoogleGenAI {
    models: Models;
    constructor(opts: { apiKey: string });
  }

  export default GoogleGenAI;
  export { GoogleGenAI, Models, GenerateContentResponse, GenerateContentOptions };
}
