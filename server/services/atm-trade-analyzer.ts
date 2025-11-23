/**
 * ATM Trade Analyzer for SPY/QQQ
 * Finds at-the-money options and uses AI to predict profitable trades
 */

import { supabaseService } from './supabase-client';
import { aiOrchestrator, AITaskType } from './ai-orchestrator';
import type { OptionContract } from '../types/schwab';

interface ATMOption {
  symbol: string;
  optionType: 'CALL' | 'PUT';
  contract: OptionContract;
  distanceFromATM: number;
  isATM: boolean;
}

export class ATMTradeAnalyzer {
  private readonly ATM_THRESHOLD = 0.02; // 2% from current price is considered ATM

  /**
   * Find ATM options (calls and puts)
   */
  findATMOptions(
    symbol: string,
    calls: OptionContract[],
    puts: OptionContract[],
    underlyingPrice: number
  ): { atmCalls: ATMOption[]; atmPuts: ATMOption[] } {
    const findNearestStrikes = (options: OptionContract[], optionType: 'CALL' | 'PUT'): ATMOption[] => {
      return options
        .filter(opt => opt.putCall === optionType)
        .map(contract => {
          const distance = Math.abs(contract.strikePrice - underlyingPrice);
          const percentDistance = distance / underlyingPrice;

          return {
            symbol,
            optionType,
            contract,
            distanceFromATM: distance,
            isATM: percentDistance <= this.ATM_THRESHOLD,
          };
        })
        .filter(opt => opt.isATM)
        .sort((a, b) => a.distanceFromATM - b.distanceFromATM)
        .slice(0, 3); // Top 3 nearest strikes
    };

    return {
      atmCalls: findNearestStrikes(calls, 'CALL'),
      atmPuts: findNearestStrikes(puts, 'PUT'),
    };
  }

  /**
   * Analyze historical volume/OI patterns to detect unusual activity
   */
  private analyzeOrderFlow(option: ATMOption): {
    hasUnusualVolume: boolean;
    volumeOIRatio: number;
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  } {
    const volume = option.contract.totalVolume;
    const openInterest = option.contract.openInterest;
    const volumeOIRatio = openInterest > 0 ? volume / openInterest : 0;

    // Unusual volume if ratio > 0.5
    const hasUnusualVolume = volumeOIRatio > 0.5;

    // Determine signal based on option type and volume
    let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

    if (hasUnusualVolume) {
      if (option.optionType === 'CALL' && option.contract.bid > option.contract.ask * 0.9) {
        signal = 'BULLISH'; // Calls being bought aggressively
      } else if (option.optionType === 'PUT' && option.contract.bid > option.contract.ask * 0.9) {
        signal = 'BEARISH'; // Puts being bought aggressively
      }
    }

    return { hasUnusualVolume, volumeOIRatio, signal };
  }

  /**
   * Use AI to predict trade opportunity
   */
  private async predictTradeWithAI(
    option: ATMOption,
    underlyingPrice: number,
    orderFlow: ReturnType<typeof this.analyzeOrderFlow>
  ): Promise<{
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
    predictedDirection?: 'UP' | 'DOWN' | 'SIDEWAYS';
    predictedMovePercent?: number;
    model: string;
  }> {
    const contract = option.contract;

    const prompt = `Analyze this ${option.symbol} 0DTE ${option.optionType} option for a potential trade opportunity:

**Option Details:**
- Symbol: ${option.symbol}
- Type: ${option.optionType}
- Strike: $${contract.strikePrice}
- Current Price: $${underlyingPrice}
- Distance from ATM: $${option.distanceFromATM.toFixed(2)} (${((option.distanceFromATM / underlyingPrice) * 100).toFixed(2)}%)

**Pricing:**
- Bid: $${contract.bid.toFixed(2)}
- Ask: $${contract.ask.toFixed(2)}
- Last: $${contract.last.toFixed(2)}
- Mark: $${contract.mark.toFixed(2)}

**Volume & Open Interest:**
- Volume: ${contract.totalVolume}
- Open Interest: ${contract.openInterest}
- Volume/OI Ratio: ${orderFlow.volumeOIRatio.toFixed(2)}
- Unusual Activity: ${orderFlow.hasUnusualVolume ? 'YES' : 'NO'}
- Order Flow Signal: ${orderFlow.signal}

**Greeks:**
- Delta: ${contract.delta.toFixed(4)}
- Gamma: ${contract.gamma.toFixed(4)}
- Theta: ${contract.theta.toFixed(4)}
- Vega: ${contract.vega.toFixed(4)}
- IV: ${(contract.volatility * 100).toFixed(1)}%

**Task:**
Based on this data, predict:
1. Should we BUY, SELL, or HOLD this option?
2. What's your confidence level (0-100)?
3. What direction will the underlying move (UP/DOWN/SIDEWAYS)?
4. What % move do you predict before market close?

Respond in JSON format:
{
  "signal": "BUY | SELL | HOLD",
  "confidence": <number 0-100>,
  "predictedDirection": "UP | DOWN | SIDEWAYS",
  "predictedMovePercent": <number>,
  "reasoning": "<detailed explanation>",
  "keyFactors": ["<list key factors for this decision>"]
}`;

    const systemPrompt = `You are an expert 0DTE options trader specializing in SPY and QQQ.
You excel at reading order flow, volume patterns, and using Greeks to predict intraday moves.
You understand that 0DTE options are highly sensitive to gamma and theta, and small moves can result in big gains or losses.
Be conservative and data-driven. Only recommend BUY signals when you have strong conviction.`;

    try {
      const result = await aiOrchestrator.execute(
        AITaskType.TRADE_PREDICTION,
        prompt,
        systemPrompt,
        { option, underlyingPrice, orderFlow }
      );

      // Parse AI response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const prediction = JSON.parse(jsonMatch[0]);
        return {
          signal: prediction.signal || 'HOLD',
          confidence: prediction.confidence || 50,
          reasoning: prediction.reasoning || result.response,
          predictedDirection: prediction.predictedDirection,
          predictedMovePercent: prediction.predictedMovePercent,
          model: result.model,
        };
      }

      // Fallback
      return {
        signal: 'HOLD',
        confidence: 50,
        reasoning: result.response,
        model: result.model,
      };
    } catch (error) {
      console.error('Error predicting trade with AI:', error);
      return {
        signal: 'HOLD',
        confidence: 0,
        reasoning: `AI prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model: 'error',
      };
    }
  }

  /**
   * Analyze ATM options and generate trade signals
   */
  async analyzeATMTrades(
    symbol: string,
    calls: OptionContract[],
    puts: OptionContract[],
    underlyingPrice: number
  ) {
    console.log(`\n🎯 Analyzing ${symbol} ATM Options...`);

    // Find ATM options
    const { atmCalls, atmPuts } = this.findATMOptions(symbol, calls, puts, underlyingPrice);

    console.log(`  Found ${atmCalls.length} ATM calls, ${atmPuts.length} ATM puts`);

    const signals = [];

    // Analyze each ATM option
    const allATMOptions = [...atmCalls, ...atmPuts];

    for (let i = 0; i < allATMOptions.length; i++) {
      const option = allATMOptions[i];

      console.log(`  [${i + 1}/${allATMOptions.length}] Analyzing ${option.optionType} $${option.contract.strikePrice}...`);

      // Analyze order flow
      const orderFlow = this.analyzeOrderFlow(option);

      // Get AI prediction
      const prediction = await this.predictTradeWithAI(option, underlyingPrice, orderFlow);

      // Only store actionable signals (BUY or SELL)
      if (prediction.signal !== 'HOLD' && prediction.confidence >= 60) {
        console.log(`    → ${prediction.signal} signal (${prediction.confidence}% confidence)`);

        await supabaseService.storeTradeSignal({
          symbol,
          optionType: option.optionType,
          signalType: prediction.signal,
          optionSymbol: option.contract.symbol,
          strikePrice: option.contract.strikePrice,
          isAtm: option.isATM,
          currentPrice: option.contract.mark,
          underlyingPrice,
          aiConfidence: prediction.confidence,
          aiReasoning: prediction.reasoning,
          aiModelUsed: prediction.model,
          predictedDirection: prediction.predictedDirection,
          predictedMovePercent: prediction.predictedMovePercent,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // Expires in 6 hours (end of trading day)
        });

        signals.push({
          option,
          prediction,
          orderFlow,
        });
      } else {
        console.log(`    → HOLD (${prediction.confidence}% confidence)`);
      }
    }

    console.log(`✓ ${symbol} ATM analysis complete - ${signals.length} actionable signals\n`);

    return signals;
  }
}

// Export singleton instance
export const atmTradeAnalyzer = new ATMTradeAnalyzer();
