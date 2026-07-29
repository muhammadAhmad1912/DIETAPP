/**
 * Future AI feature surface.
 * Intentionally unimplemented — wire providers here later
 * (meal photo recognition, macro suggestions, coaching, etc.).
 */

export type AiFeatureStatus = 'not_implemented';

export interface AiMealSuggestionRequest {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  preferences?: string[];
}

export interface AiFoodEstimateRequest {
  imageUri: string;
  notes?: string;
}

export const aiService = {
  status: 'not_implemented' as AiFeatureStatus,

  async suggestMeal(_request: AiMealSuggestionRequest): Promise<never> {
    throw new Error('AI meal suggestions are not implemented yet.');
  },

  async estimateFoodFromImage(
    _request: AiFoodEstimateRequest,
  ): Promise<never> {
    throw new Error('AI food estimation is not implemented yet.');
  },

  async coach(_prompt: string): Promise<never> {
    throw new Error('AI coaching is not implemented yet.');
  },
};
