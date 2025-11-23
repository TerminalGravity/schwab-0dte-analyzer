/**
 * AI Orchestration Layer
 * Routes tasks to optimal SOTA frontier models: GPT-5 and Gemini-3-Pro
 */

import { createClient } from '@supabase/supabase-js';

// AI Task Types
export enum AITaskType {
  CREDIT_SPREAD_ANALYSIS = 'credit_spread_analysis',
  TRADE_PREDICTION = 'trade_prediction',
  PATTERN_RECOGNITION = 'pattern_recognition',
  RISK_ASSESSMENT = 'risk_assessment',
  MARKET_SENTIMENT = 'market_sentiment',
  PORTFOLIO_OPTIMIZATION = 'portfolio_optimization',
}

// Model Selection Strategy
interface ModelStrategy {
  primary: 'openai' | 'gemini';
  fallback?: 'openai' | 'gemini';
  reason: string;
}

export class AIOrchestrator {
  private openaiApiKey: string;
  private geminiApiKey: string;
  private openaiModel: string;
  private geminiModel: string;
  private supabase: any;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.geminiApiKey = process.env.GOOGLE_API_KEY || '';
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-5';
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-3-pro';

    // Initialize Supabase for logging
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Determine which model to use based on task type
   */
  private getModelStrategy(taskType: AITaskType): ModelStrategy {
    switch (taskType) {
      case AITaskType.CREDIT_SPREAD_ANALYSIS:
        return {
          primary: 'openai',
          fallback: 'gemini',
          reason: 'GPT-5 excels at complex financial analysis and multi-step reasoning',
        };

      case AITaskType.TRADE_PREDICTION:
        return {
          primary: 'gemini',
          fallback: 'openai',
          reason: 'Gemini-3-Pro has superior pattern recognition for market prediction',
        };

      case AITaskType.PATTERN_RECOGNITION:
        return {
          primary: 'gemini',
          fallback: 'openai',
          reason: 'Gemini-3-Pro optimized for visual and data pattern analysis',
        };

      case AITaskType.RISK_ASSESSMENT:
        return {
          primary: 'openai',
          fallback: 'gemini',
          reason: 'GPT-5 provides more conservative and detailed risk analysis',
        };

      case AITaskType.MARKET_SENTIMENT:
        return {
          primary: 'gemini',
          fallback: 'openai',
          reason: 'Gemini-3-Pro better at real-time sentiment and context analysis',
        };

      case AITaskType.PORTFOLIO_OPTIMIZATION:
        return {
          primary: 'openai',
          fallback: 'gemini',
          reason: 'GPT-5 superior at multi-objective optimization problems',
        };

      default:
        return {
          primary: 'openai',
          reason: 'Default to GPT-5 for general tasks',
        };
    }
  }

  /**
   * Call OpenAI GPT-5 API
   */
  private async callOpenAI(prompt: string, systemPrompt?: string): Promise<{
    response: string;
    tokensUsed: number;
    latencyMs: number;
  }> {
    const startTime = Date.now();

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.openaiModel,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    return {
      response: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
      latencyMs,
    };
  }

  /**
   * Call Google Gemini-3-Pro API
   */
  private async callGemini(prompt: string, systemPrompt?: string): Promise<{
    response: string;
    tokensUsed: number;
    latencyMs: number;
  }> {
    const startTime = Date.now();

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    return {
      response: data.candidates[0].content.parts[0].text,
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
      latencyMs,
    };
  }

  /**
   * Log AI call to Supabase
   */
  private async logAICall(
    taskType: string,
    model: string,
    inputData: any,
    outputData: any,
    latencyMs: number,
    tokensUsed: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('ai_orchestration_log').insert({
        task_type: taskType,
        model_used: model,
        input_data: inputData,
        output_data: outputData,
        latency_ms: latencyMs,
        tokens_used: tokensUsed,
        success,
        error_message: errorMessage,
      });
    } catch (error) {
      console.error('Failed to log AI call:', error);
    }
  }

  /**
   * Execute AI task with orchestration
   */
  async execute(
    taskType: AITaskType,
    prompt: string,
    systemPrompt?: string,
    context?: any
  ): Promise<{
    response: string;
    model: string;
    tokensUsed: number;
    latencyMs: number;
    confidence?: number;
  }> {
    const strategy = this.getModelStrategy(taskType);

    console.log(`🤖 AI Orchestration: ${taskType}`);
    console.log(`   Strategy: ${strategy.primary} (${strategy.reason})`);

    let result;
    let modelUsed = strategy.primary;

    try {
      // Try primary model
      if (strategy.primary === 'openai') {
        result = await this.callOpenAI(prompt, systemPrompt);
      } else {
        result = await this.callGemini(prompt, systemPrompt);
      }

      // Log successful call
      await this.logAICall(
        taskType,
        `${strategy.primary}-${strategy.primary === 'openai' ? this.openaiModel : this.geminiModel}`,
        { prompt, systemPrompt, context },
        { response: result.response },
        result.latencyMs,
        result.tokensUsed,
        true
      );

      console.log(`✓ AI response received (${result.latencyMs}ms, ${result.tokensUsed} tokens)`);

      return {
        response: result.response,
        model: `${strategy.primary}-${strategy.primary === 'openai' ? this.openaiModel : this.geminiModel}`,
        tokensUsed: result.tokensUsed,
        latencyMs: result.latencyMs,
      };

    } catch (error) {
      console.error(`✗ ${strategy.primary} failed:`, error);

      // Try fallback model if available
      if (strategy.fallback) {
        console.log(`   Falling back to ${strategy.fallback}...`);
        modelUsed = strategy.fallback;

        try {
          if (strategy.fallback === 'openai') {
            result = await this.callOpenAI(prompt, systemPrompt);
          } else {
            result = await this.callGemini(prompt, systemPrompt);
          }

          // Log fallback success
          await this.logAICall(
            taskType,
            `${strategy.fallback}-${strategy.fallback === 'openai' ? this.openaiModel : this.geminiModel}`,
            { prompt, systemPrompt, context, fallback: true },
            { response: result.response },
            result.latencyMs,
            result.tokensUsed,
            true
          );

          console.log(`✓ Fallback successful (${result.latencyMs}ms, ${result.tokensUsed} tokens)`);

          return {
            response: result.response,
            model: `${strategy.fallback}-${strategy.fallback === 'openai' ? this.openaiModel : this.geminiModel}`,
            tokensUsed: result.tokensUsed,
            latencyMs: result.latencyMs,
          };

        } catch (fallbackError) {
          console.error(`✗ Fallback ${strategy.fallback} also failed:`, fallbackError);

          // Log fallback failure
          await this.logAICall(
            taskType,
            `${strategy.fallback}-${strategy.fallback === 'openai' ? this.openaiModel : this.geminiModel}`,
            { prompt, systemPrompt, context, fallback: true },
            null,
            0,
            0,
            false,
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          );

          throw new Error('All AI models failed');
        }
      }

      // Log primary failure (no fallback)
      await this.logAICall(
        taskType,
        `${strategy.primary}-${strategy.primary === 'openai' ? this.openaiModel : this.geminiModel}`,
        { prompt, systemPrompt, context },
        null,
        0,
        0,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  /**
   * Parallel execution for ensemble predictions
   */
  async executeEnsemble(
    taskType: AITaskType,
    prompt: string,
    systemPrompt?: string
  ): Promise<{
    responses: Array<{ model: string; response: string; tokensUsed: number; latencyMs: number }>;
    consensus?: string;
  }> {
    console.log(`🤖🤖 AI Ensemble Execution: ${taskType}`);

    const [gptResult, geminiResult] = await Promise.allSettled([
      this.callOpenAI(prompt, systemPrompt),
      this.callGemini(prompt, systemPrompt),
    ]);

    const responses = [];

    if (gptResult.status === 'fulfilled') {
      responses.push({
        model: `openai-${this.openaiModel}`,
        response: gptResult.value.response,
        tokensUsed: gptResult.value.tokensUsed,
        latencyMs: gptResult.value.latencyMs,
      });
    }

    if (geminiResult.status === 'fulfilled') {
      responses.push({
        model: `gemini-${this.geminiModel}`,
        response: geminiResult.value.response,
        tokensUsed: geminiResult.value.tokensUsed,
        latencyMs: geminiResult.value.latencyMs,
      });
    }

    console.log(`✓ Ensemble complete: ${responses.length} models responded`);

    return { responses };
  }
}

// Export singleton instance
export const aiOrchestrator = new AIOrchestrator();
