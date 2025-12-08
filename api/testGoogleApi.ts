import { ai } from './_lib/ai.js';

export default async function handler(req: any, res: any) {
  try {
    // Attempt to list available models
    const modelsPager = await ai.models.list();

    // Extract models from the pager response according to our type definition
    const modelsArray = modelsPager.models || [];

    // Process each model in the response
    const processedModels = modelsArray.map((model: any) => ({
      name: model.name,
      // Add other properties as needed from the model object
    }));

    res.status(200).json({
      models: processedModels
    });
  } catch (error) {
    console.error("Error in testGoogleApi:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}