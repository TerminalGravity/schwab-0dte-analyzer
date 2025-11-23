/**
 * Credit Spread Analyzer for SPX
 * Finds optimal credit spreads and uses AI to analyze and rank them
 */

import { supabaseService } from './supabase-client';
import { aiOrchestrator, AITaskType } from './ai-orchestrator';
import type { OptionContract } from '../types/schwab';

interface SpreadOpportunity {
  spreadType: 'CALL' | 'PUT';
  shortStrike: number;
  longStrike: number;
  shortOption: OptionContract;
  longOption: OptionContract;
  creditReceived: number;
  maxProfit: number;
  maxLoss: number;
  breakEven: number;
  riskRewardRatio: number;
  probabilityOfProfit: number;
  deltaSpread: number;
  width: number;
}

export class CreditSpreadAnalyzer {
  private readonly MIN_CREDIT = 0.50; // Minimum $0.50 credit
  private readonly MAX_WIDTH = 50; // Maximum $50 strike width
  private readonly MIN_WIDTH = 5; // Minimum $5 strike width
  private readonly TOP_SPREADS_COUNT = 20; // Analyze top 20 spreads with AI

  /**
   * Calculate all possible credit spreads from options chain
   */
  calculateCreditSpreads(
    options: OptionContract[],
    optionType: 'CALL' | 'PUT',
    underlyingPrice: number
  ): SpreadOpportunity[] {
    const spreads: SpreadOpportunity[] = [];
    const filteredOptions = options
      .filter(opt => opt.putCall === optionType)
      .sort((a, b) => a.strikePrice - b.strikePrice);

    // For call spreads: sell lower strike, buy higher strike
    // For put spreads: sell higher strike, buy lower strike

    for (let i = 0; i < filteredOptions.length; i++) {
      for (let j = i + 1; j < filteredOptions.length; j++) {
        const opt1 = filteredOptions[i];
        const opt2 = filteredOptions[j];

        let shortOption: OptionContract;
        let longOption: OptionContract;

        if (optionType === 'CALL') {
          // Call spread: sell lower strike, buy higher strike
          shortOption = opt1;
          longOption = opt2;
        } else {
          // Put spread: sell higher strike, buy lower strike
          shortOption = opt2;
          longOption = opt1;
        }

        const width = Math.abs(shortOption.strikePrice - longOption.strikePrice);

        // Skip if width is outside bounds
        if (width < this.MIN_WIDTH || width > this.MAX_WIDTH) continue;

        // Calculate credit (what we receive)
        const creditReceived = shortOption.bid - longOption.ask;

        // Skip if credit is too small
        if (creditReceived < this.MIN_CREDIT) continue;

        // Calculate max profit/loss
        const maxProfit = creditReceived * 100; // Per contract
        const maxLoss = (width - creditReceived) * 100;

        // Calculate break-even
        const breakEven = optionType === 'CALL'
          ? shortOption.strikePrice + creditReceived
          : shortOption.strikePrice - creditReceived;

        // Calculate risk/reward ratio
        const riskRewardRatio = maxLoss > 0 ? maxProfit / maxLoss : 0;

        // Estimate probability of profit (simplified using delta)
        const probabilityOfProfit = optionType === 'CALL'
          ? (1 - Math.abs(shortOption.delta)) * 100
          : Math.abs(shortOption.delta) * 100;

        // Calculate net delta of spread
        const deltaSpread = Math.abs(shortOption.delta - longOption.delta);

        spreads.push({
          spreadType: optionType,
          shortStrike: shortOption.strikePrice,
          longStrike: longOption.strikePrice,
          shortOption,
          longOption,
          creditReceived,
          maxProfit,
          maxLoss,
          breakEven,
          riskRewardRatio,
          probabilityOfProfit,
          deltaSpread,
          width,
        });
      }
    }

    // Sort by risk/reward ratio
    return spreads.sort((a, b) => b.riskRewardRatio - a.riskRewardRatio);
  }

  /**
   * Use AI to analyze and score a credit spread
   */
  private async analyzeSpreadWithAI(
    spread: SpreadOpportunity,
    underlyingPrice: number,
    marketContext: any
  ): Promise<{
    score: number;
    confidence: number;
    reasoning: string;
    model: string;
  }> {
    const prompt = `Analyze this SPX ${spread.spreadType} credit spread for 0DTE trading:

**Spread Details:**
- Type: ${spread.spreadType} Credit Spread
- Short Strike: $${spread.shortStrike}
- Long Strike: $${spread.longStrike}
- Width: $${spread.width}
- Credit Received: $${spread.creditReceived.toFixed(2)} ($${spread.maxProfit.toFixed(2)} max profit)
- Max Loss: $${spread.maxLoss.toFixed(2)}
- Break-Even: $${spread.breakEven.toFixed(2)}
- Risk/Reward: ${spread.riskRewardRatio.toFixed(2)}
- Probability of Profit: ${spread.probabilityOfProfit.toFixed(1)}%
- Net Delta: ${spread.deltaSpread.toFixed(4)}

**Market Context:**
- Current SPX Price: $${underlyingPrice}
- Distance to Short Strike: $${Math.abs(underlyingPrice - spread.shortStrike).toFixed(2)} (${((Math.abs(underlyingPrice - spread.shortStrike) / underlyingPrice) * 100).toFixed(2)}%)
- Short Strike IV: ${(spread.shortOption.volatility * 100).toFixed(1)}%
- Long Strike IV: ${(spread.longOption.volatility * 100).toFixed(1)}%

**Task:**
Score this spread from 0-100 based on:
1. Risk/reward profile
2. Probability of profit
3. Current market position relative to strikes
4. Volatility considerations
5. 0DTE specific risks (gamma, theta decay)

Respond in JSON format:
{
  "score": <number 0-100>,
  "confidence": <number 0-100>,
  "reasoning": "<detailed explanation of the score>",
  "concerns": ["<list any risks or concerns>"]
}`;

    const systemPrompt = `You are an expert options trader specializing in 0DTE (zero days to expiration) credit spreads on SPX.
You understand the risks and opportunities of same-day expiration trades, including rapid theta decay, gamma risk, and the importance of staying out of the money.
Provide objective, data-driven analysis focused on risk management.`;

    try {
      const result = await aiOrchestrator.execute(
        AITaskType.CREDIT_SPREAD_ANALYSIS,
        prompt,
        systemPrompt,
        { spread, underlyingPrice }
      );

      // Parse AI response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          score: analysis.score || 50,
          confidence: analysis.confidence || 50,
          reasoning: analysis.reasoning || result.response,
          model: result.model,
        };
      }

      // Fallback if JSON parsing fails
      return {
        score: 50,
        confidence: 50,
        reasoning: result.response,
        model: result.model,
      };
    } catch (error) {
      console.error('Error analyzing spread with AI:', error);
      return {
        score: 0,
        confidence: 0,
        reasoning: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model: 'error',
      };
    }
  }

  /**
   * Find and analyze best credit spreads for SPX
   */
  async findBestSpreads(
    calls: OptionContract[],
    puts: OptionContract[],
    underlyingPrice: number,
    expirationDate: string
  ) {
    console.log('\n💰 Analyzing SPX Credit Spreads...');

    // Calculate all possible spreads
    const callSpreads = this.calculateCreditSpreads(calls, 'CALL', underlyingPrice);
    const putSpreads = this.calculateCreditSpreads(puts, 'PUT', underlyingPrice);

    console.log(`  Found ${callSpreads.length} call spreads, ${putSpreads.length} put spreads`);

    // Take top spreads for AI analysis
    const topCallSpreads = callSpreads.slice(0, Math.floor(this.TOP_SPREADS_COUNT / 2));
    const topPutSpreads = putSpreads.slice(0, Math.floor(this.TOP_SPREADS_COUNT / 2));
    const topSpreads = [...topCallSpreads, ...topPutSpreads];

    console.log(`  Analyzing top ${topSpreads.length} spreads with AI...`);

    // Analyze each spread with AI
    const analyzedSpreads = [];
    for (let i = 0; i < topSpreads.length; i++) {
      const spread = topSpreads[i];
      console.log(`  [${i + 1}/${topSpreads.length}] Analyzing ${spread.spreadType} ${spread.shortStrike}/${spread.longStrike}...`);

      const aiAnalysis = await this.analyzeSpreadWithAI(spread, underlyingPrice, {});

      analyzedSpreads.push({
        ...spread,
        aiScore: aiAnalysis.score,
        aiConfidence: aiAnalysis.confidence,
        aiReasoning: aiAnalysis.reasoning,
        aiModelUsed: aiAnalysis.model,
      });

      // Store in database
      await supabaseService.storeCreditSpread({
        symbol: 'SPX',
        spreadType: spread.spreadType,
        shortStrike: spread.shortStrike,
        longStrike: spread.longStrike,
        shortOptionSymbol: spread.shortOption.symbol,
        longOptionSymbol: spread.longOption.symbol,
        creditReceived: spread.creditReceived,
        maxProfit: spread.maxProfit,
        maxLoss: spread.maxLoss,
        breakEven: spread.breakEven,
        riskRewardRatio: spread.riskRewardRatio,
        probabilityOfProfit: spread.probabilityOfProfit,
        deltaSpread: spread.deltaSpread,
        aiScore: aiAnalysis.score,
        aiConfidence: aiAnalysis.confidence,
        aiReasoning: aiAnalysis.reasoning,
        aiModelUsed: aiAnalysis.model,
        underlyingPrice,
        expirationDate,
        rank: i + 1,
      });
    }

    // Sort by AI score
    analyzedSpreads.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

    console.log(`✓ Credit spread analysis complete`);
    console.log(`  Top spread: ${analyzedSpreads[0]?.spreadType} ${analyzedSpreads[0]?.shortStrike}/${analyzedSpreads[0]?.longStrike} (Score: ${analyzedSpreads[0]?.aiScore})\n`);

    return analyzedSpreads;
  }
}

// Export singleton instance
export const creditSpreadAnalyzer = new CreditSpreadAnalyzer();
