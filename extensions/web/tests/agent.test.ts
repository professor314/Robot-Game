import { describe, expect, it } from 'vitest';
import { AgentApi } from '../src/agent/api';
import { HeuristicAgent, RandomAgent } from '../src/agent/agents';

describe('Agent_API', () => {
  it('produces a serializable observation with legal actions', () => {
    const api = new AgentApi({ seed: 3 });
    const obs = api.observe();
    expect(obs.player.roomKey).toBe('Main Corridor');
    expect(obs.roomTiles.length).toBeGreaterThan(0);
    expect(obs.legalActions.some((a) => a.type === 'wait')).toBe(true);
    // Observation must survive a JSON round-trip (serializable).
    expect(() => JSON.parse(JSON.stringify(obs))).not.toThrow();
  });

  it('advances deterministically for the same seed and actions', () => {
    const run = () => {
      const api = new AgentApi({ seed: 99 });
      const agent = new RandomAgent(5);
      const positions: string[] = [];
      let obs = api.observe();
      for (let i = 0; i < 20; i++) {
        const result = api.step(agent.decide(obs));
        obs = result.observation;
        positions.push(`${obs.player.roomKey}:${obs.player.x},${obs.player.y}`);
      }
      return positions;
    };
    expect(run()).toEqual(run());
  });

  it('reset returns a fresh first observation', () => {
    const api = new AgentApi({ seed: 1 });
    api.step({ type: 'move', dir: 'east' });
    const obs = api.reset();
    expect(obs.tick).toBe(0);
    expect(obs.player.roomKey).toBe('Main Corridor');
  });

  it('step returns events and never signals done (open-ended)', () => {
    const api = new AgentApi({ seed: 1 });
    const result = api.step({ type: 'move', dir: 'east' });
    expect(result.done).toBe(false);
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('a heuristic agent can run a full loop without throwing', () => {
    const api = new AgentApi({ seed: 11 });
    const agent = new HeuristicAgent();
    let obs = api.observe();
    for (let i = 0; i < 50; i++) obs = api.step(agent.decide(obs)).observation;
    expect(obs.tick).toBe(50);
  });
});
