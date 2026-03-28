# Design Pillars - Mechanics Quick Reference

When explaining mechanics, note which pillars constrain or shape the mechanic's design. This condensed reference maps each pillar to concrete mechanical implications.

## Pillar 1: No Single Optimal Strategy

**Constraint**: No weapon, class, build, or tactic should dominate all others.

**Mechanical implications**:
- Weapon categories have different effective-against armor types (rating multiplier table)
- Classes have distinct stat growth profiles (no universally best stat spread)
- 4 defense types (Deflection, Fortitude, Reflex, Will) ensure no single attack type bypasses all defense
- Skills target different defense types, so no class is universally vulnerable or resilient
- Talent trees offer meaningful build divergence within classes

**Tests**:
- **Dominance Test**: Does this make one strategy clearly superior?
- **Counter Test**: Does a meaningful counter exist for every strong strategy?

## Pillar 2: No Time-Gating

**Constraint**: No mechanic gated by real time or play sessions.

**Mechanical implications**:
- No cooldowns measured in real time (only turn-based cooldowns)
- No stamina systems or daily limits
- Progress comes from gameplay decisions, not calendar commitment

## Pillar 3: Keep Characters Alive

**Constraint**: Death is permanent and must feel avoidable. Never random or unfair.

**Mechanical implications**:
- Combat preview must accurately represent outcomes so players can assess risk
- No random one-shot mechanics (damage must be predictable within hit/crit variance)
- Healing and defensive skills exist to prevent cascading death spirals
- Constitution scaling provides enough HP to survive miscalculations at reasonable levels
- Retreat is always a viable tactical option (pace system, no forced engagement)

## Pillar 4: Player Agency

**Constraint**: No mechanics that remove player choice in a way that feels like loss of self.

**Mechanical implications**:
- Charmed condition is the one exception (acknowledged as potentially problematic)
- Status effects restrict actions but don't replace player decision-making
- Paralyzed/Immobilized block movement but don't auto-act
- AI-controlled effects (taunt) redirect but don't eliminate choice
- Condition names use mechanical/external framing, not identity-based labels

**Tests**:
- **Personhood Test**: Does this trait define the character by a deficit?
- **Agency Test**: Does this remove choice in a way that feels like "loss of self"?
- **Archetype Test**: Does this rely on harmful cultural stereotypes?

## Pillar 5: Informed Decisions

**Constraint**: Combat is mostly deterministic. Only hit chance and critical chance are random.

**Mechanical implications**:
- **No proc-based effects**: No "25% chance to apply Bleed" - effects are either 100% or conditional on visible game state
- Combat preview must show accurate damage, hit chance, and crit chance
- All stat modifiers are visible to the player (conditions, terrain, equipment)
- Rating multiplier table is deterministic (weapon rating vs armor rating)
- Condition effects are fully predictable (stat changes, duration formula)
- Talent effects are deterministic (no random talent procs)

**The only acceptable randomness**:
1. Hit chance (accuracy - dodge, rolled against d100)
2. Critical chance (perception + dexterity modifiers, rolled against d100)

**Everything else must be deterministic.**

## Pillar 6: Accessibility

**Constraint**: Anyone on a modern device can play.

**Mechanical implications**:
- No mechanics requiring precise real-time input (turn-based only)
- Enhanced visuals are opt-in
- No hardware-intensive computation in game logic

## Pillar 7: Simple But Deep

**Constraint**: Complexity must yield proportional strategic depth.

**Mechanical implications**:
- 6 core stats derive all combat values (not dozens of independent stats)
- Condition groups use paired opposites (intuitive mental model)
- Rating system (1-4) is simple but creates meaningful equipment choices
- Turn order is predictable (player -> neutral -> enemy)
- AoE, range, and targeting rules are straightforward grid-based calculations

## Cross-Pillar Tension Points

These mechanics sit at the intersection of multiple pillars:

| Mechanic | Pillars in tension | Resolution |
|----------|-------------------|------------|
| Hit chance RNG | P3 (keep alive) vs P5 (informed) | Accuracy high enough that misses are rare, not fatal |
| Critical hits | P3 (keep alive) vs P1 (variety) | 3x multiplier is impactful but survivable at reasonable HP |
| Charmed condition | P4 (agency) vs P1 (variety) | Acknowledged exception, uses external-force framing |
| Condition stacking | P7 (simple) vs P1 (depth) | Group/rating system limits stacking complexity |
| Talent power scaling | P1 (no dominance) vs P7 (depth) | Stage gating (levels 22-30) limits early power spikes |
