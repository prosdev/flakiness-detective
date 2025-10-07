// Tests for GoogleGenAIProvider functionality
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleGenAIProvider, GOOGLE_GENAI_DEFAULTS } from '../google-genai-provider';

// Create a mock instance for the Google GenAI
const mockEmbedContent = vi.fn().mockResolvedValue({
  embedding: { values: [0.1, 0.2, 0.3, 0.4, 0.5] }
});

// Fix: result.embedding is accessed in the embedContent method
const mockResult = {
  embedding: { values: [0.1, 0.2, 0.3, 0.4, 0.5] }
};

const mockGenAIInstance = {
  getGenerativeModel: vi.fn().mockReturnValue({
    embedContent: vi.fn().mockResolvedValue(mockResult)
  })
};

// Mock for error test
const mockErrorEmbedContent = vi.fn().mockRejectedValue(new Error('API error'));

// Create a simplified test class that extends GoogleGenAIProvider
class TestableGoogleGenAIProvider extends GoogleGenAIProvider {
  constructor() {
    super({
      apiKey: 'test-api-key',
      genAIInstance: mockGenAIInstance
    });
    
    // Override the model initialization to avoid undefined errors
    this.model = {
      embedContent: vi.fn().mockResolvedValue(mockResult)
    };
  }
}

describe('GoogleGenAIProvider', () => {
  let provider: TestableGoogleGenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new TestableGoogleGenAIProvider();
  });

  it('should initialize with default configuration', () => {
    // Access private property for testing
    const config = (provider as any).config;
    
    expect(config.modelName).toBe(GOOGLE_GENAI_DEFAULTS.modelName);
    expect(config.taskType).toBe(GOOGLE_GENAI_DEFAULTS.taskType);
    expect(config.dimensions).toBe(GOOGLE_GENAI_DEFAULTS.dimensions);
  });

  it('should generate embeddings for text content', async () => {
    const content = 'Test content for embedding';
    
    // Mock the model.embedContent directly since we're overriding it in the TestableGoogleGenAIProvider
    const modelEmbedContent = vi.fn().mockResolvedValue(mockResult);
    (provider.model as any).embedContent = modelEmbedContent;
    
    const embedding = await provider.embedContent(content);
    
    expect(embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(modelEmbedContent).toHaveBeenCalledWith(
      content, 
      { taskType: GOOGLE_GENAI_DEFAULTS.taskType }
    );
  });

  it('should process batch embeddings', async () => {
    const contents = ['Content 1', 'Content 2', 'Content 3'];
    
    // Spy on embedContent to verify it's called for each item
    const embedContentSpy = vi.spyOn(provider, 'embedContent')
      .mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
    
    const embeddings = await provider.embedBatch(contents);
    
    expect(embeddings).toHaveLength(3);
    expect(embedContentSpy).toHaveBeenCalledTimes(3);
    expect(embeddings[0]).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('should handle errors during embedding generation', async () => {
    // Create a provider that uses the error mock
    const errorModel = {
      embedContent: vi.fn().mockRejectedValue(new Error('API error'))
    };
    
    const errorProvider = new GoogleGenAIProvider({
      apiKey: 'test-api-key',
      genAIInstance: {
        getGenerativeModel: vi.fn().mockReturnValue(errorModel)
      }
    });
    
    await expect(errorProvider.embedContent('Test content')).rejects.toThrow(
      'Failed to generate embedding: Error: API error'
    );
  });
});

// Test the configuration overrides
describe('GoogleGenAIProvider Configuration', () => {
  it('should override default configuration with provided values', () => {
    const provider = new GoogleGenAIProvider({
      apiKey: 'test-api-key',
      modelName: 'custom-model',
      taskType: 'SEMANTIC_SIMILARITY',
      dimensions: 1024,
      genAIInstance: mockGenAIInstance
    });
    
    // Access private property for testing
    const config = (provider as any).config;
    
    expect(config.modelName).toBe('custom-model');
    expect(config.taskType).toBe('SEMANTIC_SIMILARITY');
    expect(config.dimensions).toBe(1024);
  });
});

// Note: Factory function tests are omitted as they're simple wrappers around the constructor
// In a real-world scenario, you would verify the factory function creates an instance of the class