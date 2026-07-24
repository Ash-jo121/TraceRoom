export function calculateSma(values: readonly number[], period: number): number {
  assertSeries(values, period);
  const window = values.slice(-period);
  return round(window.reduce((sum, value) => sum + value, 0) / period);
}

export function calculateEma(values: readonly number[], period: number): number {
  assertSeries(values, period);
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (const value of values.slice(period)) {
    ema = value * multiplier + ema * (1 - multiplier);
  }

  return round(ema);
}

export function calculateRsi(values: readonly number[], period: number): number {
  assertSeries(values, period + 1);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return round(100 - 100 / (1 + relativeStrength));
}

export function calculateAverage(values: readonly number[], period: number): number {
  assertSeries(values, period);
  const window = values.slice(-period);
  return Math.round(window.reduce((sum, value) => sum + value, 0) / period);
}

function assertSeries(values: readonly number[], minimum: number): void {
  if (
    values.length < minimum ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(`At least ${minimum} finite values are required.`);
  }
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
