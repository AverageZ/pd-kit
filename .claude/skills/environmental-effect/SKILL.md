---
name: environmental-effect
description: Create, modify, or debug environmental tile effects including fire, ice, wind, rain, and their interactions. Use when adding new effect types, interaction rules, propagation behavior, or integrating effects with pathfinding and skills.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
model: sonnet
---

# Environmental Effect Lifecycle

You are an expert game systems designer implementing tile-based environmental effects for a turn-based tactics game. Effects must be deterministic (Design Pillar #5: no random proc mechanics). All interactions follow declarative rules in the interaction registry.

## Architecture Overview

Environmental effects are tile-based states that interact with each other, propagate across the board, and affect units. The system uses a Bridge Saga pattern: Skills -> `skillToEnvironmentalTileEffects` -> `environmentalEffectManager`.

Important: Use `mechanics-explainer` skill to confirm game mechanics

### Key Files

| File                                                            | Purpose                                                                                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/type-definitions/environmental-effects.ts`                 | All types: `TileEnvironmentalEffect`, `EnvironmentalEffectType`, `EnvironmentalInteraction`, `InteractionResult`, `Intensity`, `TileMaterial`, directions, weather |
| `src/systems/environmental-effects/interactionRegistry.ts`      | Declarative interaction rules with priority levels                                                                                                                 |
| `src/systems/environmental-effects/interactionProcessor.ts`     | Processes interactions on tiles                                                                                                                                    |
| `src/systems/environmental-effects/index.ts`                    | Main saga entry point                                                                                                                                              |
| `src/systems/environmental-effects/environmentalEffectManager/` | Manager saga: validates materials, creates effects                                                                                                                 |
| `src/systems/environmental-effects/fireSpread.ts`               | Fire propagation (wind-aware, intensity-based)                                                                                                                     |
| `src/systems/environmental-effects/windPropagationAlgorithm.ts` | Wind field calculation (pure function)                                                                                                                             |
| `src/systems/environmental-effects/rainPropagationAlgorithm.ts` | Rain field calculation (pure function)                                                                                                                             |
| `src/systems/environmental-effects/utils.ts`                    | Shared utilities (`normalizeEffectPair`)                                                                                                                           |
| `src/state/environmental-effects/`                              | Redux state: `tileStates`, `propagationQueue`, `zones`, `weather`                                                                                                  |
| `src/constants/simpleTileDefinitions.ts`                        | Tile material and modifier definitions                                                                                                                             |
| `documentation/technical-reference/environmental-effects.md`    | Full design document                                                                                                                                               |

### Intensity System

Effects use a 1-3 intensity scale (type `Intensity = 1 | 2 | 3`). Intensity affects:

- Duration/strength of damage
- Propagation reach (fire at intensity 3 spreads all directions; intensity 2 + wind = downwind only)
- Interaction outcomes (fire(3) + ice(1) = fire reduced to 2, ice removed, steam(1) created)

### Tile Materials

Material affects effect compatibility:

- Fire requires flammable material (grass, wood). Fire on water transforms to steam. Fire on stone is blocked.
- Material definitions and descriptions in `src/constants/simpleTileDefinitions.ts`

### Interaction Registry

`src/systems/environmental-effects/interactionRegistry.ts` contains `EFFECT_INTERACTIONS: EnvironmentalInteraction[]`.

Each interaction has:

- `id`: Unique string identifier
- `effects`: Normalized pair via `normalizeEffectPair()` (alphabetical order guaranteed)
- `timing`: `'on-create'` (immediate when effect placed) or `'turn-start'` (during turn transition)
- `priority`: Number determining execution order (lower = earlier)
- `resolve`: Function `(effectA, effectB, context) => InteractionResult`

Current interactions:

| ID                          | Effects      | Priority | Timing     | Outcome                                                |
| --------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------ |
| `fire-ice-immediate-cancel` | fire + ice   | 10       | on-create  | Steam created, weaker effect removed, stronger reduced |
| `fire-water-steam`          | fire + water | 10       | on-create  | Steam created (same intensity logic as fire+ice)       |
| `fire-web-destroy`          | fire + web   | 10       | on-create  | Web destroyed                                          |
| `fire-oil-intensify`        | fire + oil   | 15       | on-create  | Fire maxes to intensity 3, oil consumed                |
| `rain-fire-suppress`        | fire + rain  | 20       | turn-start | Fire reduced/extinguished by rain, smoke created       |

**Priority ranges:**

- 10-19: Immediate cancellations (one effect destroys/replaces another)
- 20-29: Environmental modifications (weather affecting ground effects)
- 30-39: Spread modifiers (wind affecting fire direction)

### InteractionResult Shape

```typescript
type InteractionResult = {
  add: Array<{
    type: EnvironmentalEffectType;
    intensity: Intensity;
    duration?: number;
  }>;
  remove: Set<GameId>; // Effect IDs to remove
  modify: Map<GameId, { newIntensity?: Intensity; extendDuration?: number }>;
};
```

### Bridge Saga Pattern

Skills do NOT call `environmentalEffectManager` directly. Instead:

1. Skill saga calls `skillToEnvironmentalTileEffects({ causedBy, skill, target })`
2. Bridge saga calculates AoE, determines affected tiles
3. Bridge saga calls `environmentalEffectManager({ causedBy, effect, target })` per tile
4. Manager validates material compatibility, checks immediate interactions, creates effect

### `TileEnvironmentalEffect` Shape

```typescript
type TileEnvironmentalEffect = {
  id: GameId;
  type: EnvironmentalEffectType;
  intensity: Intensity;
  expiresOnTurn: number;
  direction?: Direction; // For wind, water flow
  source?: Targetable; // What caused this effect
  meta?: {
    windSourceId?: GameId; // For wind cleanup/tracking
    rainSourceId?: GameId; // For rain cleanup/tracking
    description?: Description;
  };
};
```

## Workflow: Adding a New Environmental Effect Type

1. **Add to `EnvironmentalEffectType` union** in `src/type-definitions/environmental-effects.ts`

2. **Run `pnpm type-check`** -- fix any `assertNever` or exhaustive switch errors across the codebase

3. **Add material validation rules** in `environmentalEffectManager/validation.ts`:
   - Which materials block this effect?
   - Does this effect transform on certain materials?

4. **Add CSS visual class** in `EnvironmentalEffectsLayer.module.css`:
   - `.effectNewType` class with background-color, border, and animation

5. **Add interaction rules** to `interactionRegistry.ts`:
   - What happens when this effect meets existing effects?
   - Choose appropriate priority (10-19, 20-29, 30-39) and timing

6. **Add propagation rules** (if the effect spreads):
   - Create propagation algorithm file as a pure function
   - Add configuration type (like `WindSourceConfig` or `RainSourceConfig`)
   - Wire into turn-start processing

7. **Add pathfinding cost integration** if effect modifies movement:
   - Update `src/utils/pathfinder/` environmental modifier logic
   - Update bot scoring hazard evaluators

8. **Write tests**:
   - Interaction tests in relevant test files
   - Propagation tests if applicable
   - E2E test in `e2e/features/environmental/`

9. **Update documentation** in `documentation/technical-reference/environmental-effects.md`

## Workflow: Adding a New Interaction Rule

1. **Add to `EFFECT_INTERACTIONS` array** in `interactionRegistry.ts`:

```typescript
{
  effects: normalizeEffectPair('effectA', 'effectB'),
  id: 'effectA-effectB-description',
  priority: <10-39>,
  resolve: (effectA, effectB, _context): InteractionResult => {
    // Determine which is which (order not guaranteed)
    const [a, b] = effectA.type === 'effectA'
      ? [effectA, effectB]
      : [effectB, effectA];
    return {
      add: [],
      modify: new Map(),
      remove: new Set(),
    };
  },
  timing: 'on-create' | 'turn-start',
}
```

2. **Always use `normalizeEffectPair()`** -- guarantees alphabetical order so lookups work

3. **Handle intensity asymmetry**: When intensities differ, stronger effect partially survives. Follow the fire+ice pattern:
   - Equal intensity: both removed, byproduct created
   - Unequal: weaker removed, stronger reduced by weaker's intensity, byproduct created

4. **Choose priority carefully**:
   - 10-19: Immediate cancellations
   - 20-29: Environmental modifications
   - 30-39: Spread modifiers

5. **Write tests** for the new interaction

6. **Verify no duplicate pairs** at the same timing

## Workflow: Modifying Propagation Behavior

1. **Understand existing algorithms** (all are pure functions):
   - Fire spread (`fireSpread.ts`): Wind-aware, checks flammability, intensity-based thresholds
   - Wind propagation (`windPropagationAlgorithm.ts`): Directional with lateral spread based on intensity
   - Rain propagation (`rainPropagationAlgorithm.ts`): Similar to wind, influenced by existing wind on tiles

2. **Source configs** use `WindSourceConfig` or `RainSourceConfig`:
   - `origin` + optional `extendsTo` for line sources (e.g., entire map edge)
   - `direction`: Cardinal direction
   - `intensity`: Affects forward reach and lateral spread

3. **Modify the algorithm file** (not the saga wrapper):
   - Algorithm files are pure functions returning `WindPropagationResult[]` or `RainPropagationResult[]`
   - Saga files handle dispatching and state updates
   - This separation makes algorithms easy to test

4. **Write unit tests** for the algorithm (pure function, easy to test with various board configurations)

## Workflow: Integrating Effects with Pathfinding

1. **Environmental modifiers** in `src/utils/pathfinder/createBoardWithEnvironmentalModifiers.ts`:
   - Two-level integration: pathfinding utilities + UI components
   - Applies environmental effects to movement costs

2. **Bot scoring evaluators** in `src/systems/bot-planner/scoring/evaluators/`:
   - `scoreZoneControlValue.ts` -- Environmental zone control scoring
   - `scorePathBlockingValue.ts` -- Path blocking from hazards
   - Hazard tolerance varies by behavior (`HAZARD_TOLERANCE` in bot scoring constants)

## Constraints and Rules

### DO

- Use `normalizeEffectPair()` for all interaction pair definitions
- Handle intensity asymmetry in interaction `resolve` functions
- Set appropriate priority ranges (10-19, 20-29, 30-39)
- Validate material compatibility before creating effects (go through the manager)
- Use the bridge saga pattern for skill-to-effect integration
- Keep propagation algorithms as pure functions (separate from saga wrappers)
- Track effect source via `source?: Targetable`
- Set `expiresOnTurn` relative to `currentTurn + duration`

### DON'T

- Add random probability to interaction outcomes (Design Pillar #5)
- Dispatch `createTileEnvironmentalEffect` directly -- always use `environmentalEffectManager`
- Skip the `normalizeEffectPair()` call (interaction lookups will fail)
- Hardcode turn numbers -- use `currentTurn + duration`
- Put AoE calculation logic in the effect manager (belongs in bridge saga)
- Create interaction rules with overlapping pairs at the same timing
- Give propagation algorithms side effects (keep them pure)

### Anti-Patterns

- **Skipping material validation**: Always go through `environmentalEffectManager`, never create effects directly
- **Interaction priority collision**: Two interactions at the same priority for the same pair. Lower priority runs first.
- **Stateless propagation gone wrong**: Propagation algorithms should receive all needed data as parameters, never select from Redux state
- **Missing intensity handling**: All interactions must handle the case where intensities differ. Never assume equal intensity.
- **Fire spread without flammability check**: Fire only spreads to flammable materials (grass, wood). Always check material compatibility.

## Integration Points

| System                                                      | How It Integrates                                        |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| Skills (`src/systems/game/skill-effects/`)                  | Skills create effects via bridge saga                    |
| Bot Planner (`src/systems/bot-planner/scoring/evaluators/`) | Hazard scoring for AI pathfinding                        |
| Tiles (`src/type-definitions/tiles.ts`)                     | Material definitions affect compatibility                |
| Pathfinding (`src/utils/pathfinder/`)                       | Environmental costs modify movement                      |
| Turn System (`src/systems/game/`)                           | Turn-start interactions processed during turn transition |
| UI (`src/state/environmental-effects/selectors.ts`)         | Fire spread predictions, effect display metadata         |

## Testing Requirements

- Every interaction rule needs test coverage
- Propagation algorithm functions need unit tests with various board configurations
- All material + effect combinations should be tested for validation
- E2E tests for effect creation and interaction in `e2e/features/environmental/`
- Safe test commands: `pnpm test:src:single -- path/to/file.test.ts`
- Never pipe test output
