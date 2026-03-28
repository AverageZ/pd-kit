# Game Systems Implementation Map

Quick-reference for locating mechanic implementations. Use this to find the right files before reading code.

## Stat System

### Base Stats & Growth

| Concept                         | File                                          | Key Export                             |
| ------------------------------- | --------------------------------------------- | -------------------------------------- |
| Class base stats & growth rates | `src/constants/gameConstants.ts`              | `baseClassStats`                       |
| Class base defenses             | `src/constants/gameConstants.ts`              | `baseClassDefenses`                    |
| Ability score modifier formula  | `src/utils/combat/getAbilityScoreModifier.ts` | `getAbilityScoreModifier` (score - 10) |
| Max level (30)                  | `src/constants/gameConstants.ts`              | `maxUnitLevel`                         |

### Stat Derivation Pipeline

Order: Base Scores -> Floor -> Stat Modifiers -> Terrain Adjustments -> Conditions

| Step                                 | File                                           | Key Export                |
| ------------------------------------ | ---------------------------------------------- | ------------------------- |
| Floor base scores to integers        | `src/state/units/selectors/floorBaseScores.ts` | `floorBaseScores`         |
| Apply stat modifiers (buffs/debuffs) | `src/state/units/selectors/withModifiers.ts`   | `applyStatModifiers`      |
| Apply terrain adjustments            | `src/state/units/selectors/withModifiers.ts`   | `applyTerrainAdjustments` |
| Apply condition effects              | `src/state/units/selectors/withConditions.ts`  | `applyConditions`         |
| Full unit selector (applies all)     | `src/state/units/selectors/selectors.ts`       | `selectById`, `selectAll` |

### Derived Stats (Defenses)

| Stat       | File                                             | Key Export             | Formula Summary                                       |
| ---------- | ------------------------------------------------ | ---------------------- | ----------------------------------------------------- |
| Health     | `src/state/units/selectors/healthCalculation.ts` | `getHealthForUnit`     | Constitution modifier + class base                    |
| Deflection | `src/state/units/selectors/derivedStats.ts`      | `getDeflectionForUnit` | Resolve modifier + shield + conditions + flanking     |
| Focus      | `src/state/units/selectors/derivedStats.ts`      | `getFocusForUnit`      | Base + condition bonuses (max 1 per type)             |
| Fortitude  | `src/state/units/selectors/derivedStats.ts`      | `getFortitudeForUnit`  | Base + might(2x) + constitution(2x) modifiers         |
| Reflex     | `src/state/units/selectors/derivedStats.ts`      | `getReflexForUnit`     | Base + dex(2x) + perception(2x) - armor penalty       |
| Will       | `src/state/units/selectors/derivedStats.ts`      | `getWillForUnit`       | Base + intellect(2x) + resolve(2x)                    |
| Pace       | `src/state/units/selectors/derivedStats.ts`      | `getPaceForUnit`       | Base x dex modifier, blocked by immobilized/paralyzed |

### Action Stats (Combat Output)

| Stat            | File                                       | Key Export                     | Formula Summary                                                 |
| --------------- | ------------------------------------------ | ------------------------------ | --------------------------------------------------------------- |
| Damage          | `src/state/units/selectors/actionStats.ts` | `getDamageForUnit`             | Weapon damage x might modifier x focus bonus                    |
| Skill Damage    | `src/state/units/selectors/actionStats.ts` | `getSkillDamageForUnit`        | Potency x might x focus x talent multipliers                    |
| Accuracy        | `src/state/units/selectors/actionStats.ts` | `getAccuracyForUnit`           | 90 + perception + weapon bonus + tile penalty + talents         |
| Critical        | `src/state/units/selectors/actionStats.ts` | `getCriticalForUnit`           | Perception + dexterity modifiers (0 if frightened)              |
| Dodge           | `src/state/units/selectors/actionStats.ts` | `getDodgeForUnit`              | 1 + reflex x 0.3 + cover(15) + obscured(10)                     |
| Attack Speed    | `src/state/units/selectors/actionStats.ts` | `getAttackSpeedForUnit`        | Weapon attacks/turn x dex modifier (0 if terrified, 1 if dazed) |
| AoE Bonus       | `src/state/units/selectors/actionStats.ts` | `_getAreaOfEffectBonusForUnit` | intellect x 0.06 + 1 + talent bonuses                           |
| Action Duration | `src/state/units/selectors/actionStats.ts` | `getActionDurationForUnit`     | intellect x 0.05 + 1                                            |
| Power/Potency   | `src/state/units/selectors/actionStats.ts` | `getPowerForUnit`              | Base potency x might x 0.05 focus bonus                         |

## Combat System

### Combat Resolution

| Concept                      | File                                          | Key Export                     |
| ---------------------------- | --------------------------------------------- | ------------------------------ |
| Main combat saga             | `src/systems/combat/combatSystem.ts`          | `combatSystem`                 |
| Combat watchers (start/stop) | `src/systems/combat/index.ts`                 | `watchStart`, `watchStop`      |
| Mechanism combat             | `src/systems/combat/mechanismCombatSystem.ts` | mechanism-specific combat      |
| Post-damage hooks            | `src/systems/combat/hooks/onDamageDealt.ts`   | condition application, healing |

### Combat Selectors

| Concept              | File                                                        | Key Export                                            |
| -------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Hit chance           | `src/state/combat/selectors/selectHitChance.ts`             | `selectHitChance` (accuracy - dodge, clamped 0-100)   |
| Hit count            | `src/state/combat/selectors/selectHitCount.ts`              | `selectHitCount`                                      |
| Attack damage        | `src/state/combat/selectors/selectAttackDamage.ts`          | `selectAttackDamage` (16 talent multipliers + rating) |
| Critical chance      | `src/state/combat/selectors/selectCriticalChance.ts`        | `selectCriticalChance`                                |
| Critical multiplier  | `src/state/combat/selectors/getCriticalDamageMultiplier.ts` | `getCriticalDamageMultiplier`                         |
| Skill damage         | `src/state/combat/selectors/selectSkillDamage.ts`           | `selectSkillDamage`                                   |
| Skill hit chance     | `src/state/combat/selectors/selectSkillHitChance.ts`        | `selectSkillHitChance`                                |
| Skill crit chance    | `src/state/combat/selectors/selectSkillCriticalChance.ts`   | `selectSkillCriticalChance`                           |
| Skill healing        | `src/state/combat/selectors/selectSkillHealing.ts`          | `selectSkillHealing`                                  |
| Skill AoE targets    | `src/state/combat/selectors/selectSkillAoETargets.ts`       | `selectSkillAoETargets`                               |
| Condition duration   | `src/state/combat/selectors/selectConditionDuration.ts`     | `selectConditionDuration`                             |
| Illumination context | `src/state/combat/selectors/selectIlluminationContext.ts`   | `selectIlluminationContext`                           |
| Combat participants  | `src/state/combat/selectors/selectCombat.ts`                | `selectCombatAttacker`, `selectCombatReceiver`        |

### Combat Utilities

| Concept                             | File                                                 | Key Export                |
| ----------------------------------- | ---------------------------------------------------- | ------------------------- |
| Ability score modifier              | `src/utils/combat/getAbilityScoreModifier.ts`        | `getAbilityScoreModifier` |
| Armor rating                        | `src/utils/combat/getArmorRatingForUnit.ts`          | `getArmorRatingForUnit`   |
| Rating multiplier (weapon vs armor) | `src/utils/combat/getRatingMultiplier.ts`            | `getRatingMultiplier`     |
| Rating table data                   | `src/constants/gameConstants.ts`                     | `ratingsTable`            |
| Shield wall protection              | `src/utils/combat/isProtectedByShieldWall.ts`        | `isProtectedByShieldWall` |
| AoE shielding factor                | `src/utils/combat/getAoEShieldingFactor.ts`          | `getAoEShieldingFactor`   |
| Fall damage                         | `src/utils/combat/fallDamage.ts`                     | `calculateFallDamage`     |
| Experience calc                     | `src/utils/combat/experienceCalc.ts`                 | `getExperience`           |
| Random roll (hit/crit)              | `src/utils/combat/rollDie.ts`                        | `rollDie` (0-100)         |
| Flanking detection                  | `src/state/units/selectors/selectFlankingContext.ts` | `selectFlankingContext`   |

## Unit Action Lifecycle (Spent State)

The game uses a **single-field action economy**: `spent` is the sole gatekeeper. There is no separate "hasMoved" / "hasAttacked" tracking — any major action (attack, skill, assist) spends the unit completely. Movement alone does not spend a unit.

### Definition

| Concept                         | File                                                               | Key Export     |
| ------------------------------- | ------------------------------------------------------------------ | -------------- |
| `spent` field on Unit type      | `src/type-definitions/types.ts`                                    | `Unit.spent`   |
| Visual feedback for spent units | `src/features/game/game-board/unit-layer/UnitComponent.module.css` | `.spent` class |

### What Marks a Unit as Spent

| Trigger              | File                                          | Notes                                                                       |
| -------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Attacking (combat)   | `src/systems/combat/combatSystem.ts`          | Exception: Rogue Elusive talent                                             |
| Attacking mechanisms | `src/systems/combat/mechanismCombatSystem.ts` | Same Elusive exception                                                      |
| Casting a skill      | `src/systems/game/applySkill.ts`              | Conditional: skills define `spendsUnit?: boolean` (default `true`). Skills with `spendsUnit: false` use cooldown as the only balance mechanism |
| Stunned condition    | `src/state/units/selectors/withConditions.ts` | Synthetic — applied via selector, not reducer                               |

### What Resets Spent

| Trigger         | File                         | Notes                                                  |
| --------------- | ---------------------------- | ------------------------------------------------------ |
| Turn transition | `src/state/units/reducer.ts` | On `nextTurnOk`, resets all units of the incoming team |

### Key Validation Gates

Spent status blocks most unit actions. Key check locations:

| Gate                | File                                                    |
| ------------------- | ------------------------------------------------------- |
| Movement tiles      | `src/state/game/selectors/selectAccessibleTiles.ts`     |
| Attack tiles        | `src/state/game/selectors/selectAttackTiles.ts`         |
| Assist tiles        | `src/state/game/selectors/selectAssistTiles.ts`         |
| Item use (bag UI)   | `src/features/game/game-board/info-display/unit-info-modal/BagTab.tsx` |
| Skill button        | `src/features/game/game-board/portraits/UnitSkills.tsx` |
| Drop tiles / button | `src/state/game/selectors/selectDropTiles.ts`           |
| Bot planner         | `src/systems/bot-planner/index.ts`                      |

## Conditions / Status Effects

### Data & Types

| Concept                       | File                                     | Key Export                       |
| ----------------------------- | ---------------------------------------- | -------------------------------- |
| Condition type definitions    | `src/type-definitions/conditions.ts`     | `Condition` (union of 40+ types) |
| Condition descriptions & data | `src/constants/conditionDescriptions.ts` | `conditionDescriptions`          |

### State Management

| Concept            | File                                         | Key Export                                                   |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------ |
| Conditions reducer | `src/state/conditions/reducer.ts`            | `conditionsAdapter`, `actions`                               |
| Conditions by unit | `src/state/conditions/selectors.ts`          | `selectConditionsByUnitId` (includes synthetic from talents) |
| Conditions + units | `src/state/conditions/selectorsWithUnits.ts` | Combined selectors                                           |

### Condition Application System

| Concept                         | File                                                                  | Key Export                                              |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Condition effect manager (main) | `src/systems/game/condition-effect-manager/index.ts`                  | `conditionEffectManager`                                |
| Process single condition        | `src/systems/game/condition-effect-manager/processConditionEffect.ts` | `processConditionEffect`                                |
| Conflict resolution helpers     | `src/systems/game/condition-effect-manager/helpers.ts`                | `findHigherRatedCondition`, `findPairedCondition`, etc. |
| Condition removal on death      | `src/systems/game/conditions/removeUnitConditions.ts`                 | removal saga                                            |
| Positioning condition cleanup   | `src/systems/conditions/removePositioningConditions.ts`               | `watchPositioningConditionCleanup`                      |

### Condition Duration

| Concept              | File                                                    | Key Export                                                                    |
| -------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Duration calculation | `src/state/combat/selectors/selectConditionDuration.ts` | `selectConditionDuration`                                                     |
| Duration formula     | --                                                      | Base x (1 + 0.05 x (intellect - 10)) x (1 - 0.025 x max(0, will - 20)), min 1 |

## Skills

### Data & Types

| Concept                  | File                                 | Key Export                         |
| ------------------------ | ------------------------------------ | ---------------------------------- |
| Skill type definitions   | `src/type-definitions/skills.ts`     | `Skill` (30+ skill types)          |
| Skill potency & AoE data | `src/constants/skillDescriptions.ts` | `baseSkillPotency`, `baseSkillAoE` |
| Skill target validation  | `src/utils/skillTargetValidation.ts` | validation functions               |

### Skill Casting System

| Concept              | File                                            | Key Export                                   |
| -------------------- | ----------------------------------------------- | -------------------------------------------- |
| Cast skill watcher   | `src/systems/game/index.ts`                     | `watchCastSkill`                             |
| Unit skills selector | `src/state/units/selectors/selectUnitSkills.ts` | `selectUnitSkills`, `selectUnitSkillEffects` |

### Individual Skill Effects (all in `src/systems/game/skill-effects/`)

| Skill             | File                              |
| ----------------- | --------------------------------- |
| Arcane Blast/Bolt | `arcaneBlast.ts`, `arcaneBolt.ts` |
| Fire Blast/Bolt   | `fireBlast.ts`, `fireBolt.ts`     |
| Void Blast/Bolt   | `voidBlast.ts`, `voidBolt.ts`     |
| Frost Nova        | `frostNova.ts`                    |
| Heal              | `heal.ts`                         |
| Holy Shield       | `holyShield.ts`                   |
| Identify          | `identify.ts`                     |
| Overpower         | `overpower.ts`                    |
| Place Trap        | `placeTrap.ts`                    |
| Restore (HoT)     | `restore.ts`                      |
| Shield Wall       | `shieldWall.ts`                   |
| Silence           | `silence.ts`                      |
| Smite             | `smite.ts`                        |
| Snare             | `snare.ts`                        |
| Stealth           | `stealth.ts`                      |
| Stone Skin        | `stoneSkin.ts`                    |
| Summon Familiar   | `summonFamiliar.ts`               |
| Taunt             | `taunt.ts`                        |
| Volley            | `volley.ts`                       |
| War Cry           | `warCry.ts`                       |
| Wild Form         | `wildForm.ts`                     |
| Consume           | `consume.ts`                      |
| Dazing Strike     | `dazing-strike.ts`                |
| Curse             | `curse.ts`                        |

### Skill Effect Utilities (`src/systems/game/skill-effects/utils/`)

| Concept              | File                                                 |
| -------------------- | ---------------------------------------------------- |
| Effect duration calc | `calculateEffectDuration.ts` (base 2 + intellect/10) |
| Consecrated ground   | `createConsecratedGroundAtPosition.ts`               |
| Flourishing ground   | `createFlourishingGroundAtPosition.ts`               |

## Talents

### Data & Types

| Concept                 | File                              | Key Export                                              |
| ----------------------- | --------------------------------- | ------------------------------------------------------- |
| Talent type definitions | `src/type-definitions/talents.ts` | `TalentId`, `Talent`, `TalentTree`, `TalentStage` (A-K) |
| Talent trees by class   | `src/constants/talentTrees.ts`    | `talentTreeByClass`, `TalentGraph`                      |
| Talent guards/checks    | `src/utils/guards.ts`             | `warriorHasBattleHardenedTalent`, etc.                  |

### Individual Talent Trees (`src/constants/talent-trees/`)

| Class    | File          |
| -------- | ------------- |
| Warrior  | `warrior.ts`  |
| Paladin  | `paladin.ts`  |
| Cleric   | `cleric.ts`   |
| Ranger   | `ranger.ts`   |
| Rogue    | `rogue.ts`    |
| Druid    | `druid.ts`    |
| Mage     | `mage.ts`     |
| Warlock  | `warlock.ts`  |
| Cavalier | `cavalier.ts` |

### Talent Effect System

| Concept          | File                                | Key Export                      |
| ---------------- | ----------------------------------- | ------------------------------- |
| Root talent saga | `src/systems/game/talents/index.ts` | `talentsRootSaga` (26 watchers) |

Key talent implementations (all in `src/systems/game/talents/`):
`blessedWeapon.ts`, `bloodthirst.ts`, `breakTheLineTakeTheField.ts`, `coordinatedCharge.ts`, `disruptionWake.ts`, `divineInsight.ts`, `divineRetribution.ts`, `existentialDrain.ts`, `formationBreaker.ts`, `inspiringCommand.ts`, `intoTheFray.ts`, `lastToFall.ts`, `lifebloom.ts`, `poisonBlade.ts`, `primalVitality.ts`, `rallyingPresence.ts`, `righteousFury.ts`, `seasonedFighter.ts`, `spectralServant.ts`, `stalwartStand.ts`, `strengthInNumbers.ts`, `surgeOfPower.ts`, `sweepingCharge.ts`, `symbioticBond.ts`, `unyieldingFaith.ts`, `webOfFate.ts`

## Items & Equipment

### Data & Types

| Concept                   | File                             | Key Export                                         |
| ------------------------- | -------------------------------- | -------------------------------------------------- |
| Item type definitions     | `src/type-definitions/items.ts`  | `Item` (5 categories), `EquipSlot`, `Rating` (1-4) |
| Weapon categories & stats | `src/constants/gameConstants.ts` | `weaponCategories`                                 |

### State Management

| Concept                | File                                    | Key Export                                             |
| ---------------------- | --------------------------------------- | ------------------------------------------------------ |
| Items reducer          | `src/state/items/reducer.ts`            | `itemsAdapter`, `actions`                              |
| Item selectors         | `src/state/items/selectors.ts`          | `selectItemsByUnit`, `selectEquippedItemsByUnit`, etc. |
| Stat modifiers reducer | `src/state/stat-modifiers/reducer.ts`   | `statModifiersAdapter`                                 |
| Stat modifiers by unit | `src/state/stat-modifiers/selectors.ts` | `selectModifiersForUnit`                               |

### Item System Sagas (all in `src/systems/game/items/`)

| Action                | File                             |
| --------------------- | -------------------------------- |
| Consume item          | `consumeItem.ts`                 |
| Equip/unequip         | `equipItem.ts`, `unEquipItem.ts` |
| Drop item             | `dropItem.ts`                    |
| Pick up item          | `pickUpItem.ts`                  |
| Trade item            | `tradeItem.ts`                   |
| Activate placed items | `activateItemsAtPosition.ts`     |
| Recharge on kill      | `rechargeOnKill.ts`              |

## AI / Bot Behavior

### Core System

| Concept                          | File                                         | Key Export             |
| -------------------------------- | -------------------------------------------- | ---------------------- |
| Main planner saga                | `src/systems/bot-planner/index.ts`           | `planner`              |
| Decision engine                  | `src/systems/bot-planner/BotBrain.ts`        | `createBotBrain`       |
| Default AI scripts (7 behaviors) | `src/systems/bot-planner/defaultScripts.ts`  | `defaultScripts`       |
| Behavior descriptions            | `src/constants/behaviorDescriptions.ts`      | `behaviorDescriptions` |
| Tactic type guards               | `src/systems/bot-planner/tacticGuards.ts`    | guard functions        |
| Failure messages                 | `src/systems/bot-planner/failureMessages.ts` | `Failures`             |

### Bot Conditions (`src/systems/bot-planner/conditions/`)

| Condition        | File                                   | Purpose                                              |
| ---------------- | -------------------------------------- | ---------------------------------------------------- |
| Tactical state   | `tacticalState.ts`                     | healthy/wounded/critical/flanked/isolated/surrounded |
| Level comparison | `level.ts`                             | nearest/furthest foe/ally level                      |
| Nearest unit     | `nearest.ts`                           | find nearest matching unit                           |
| Furthest unit    | `furthest.ts`                          | find furthest matching unit                          |
| Stat threshold   | `statLevel.ts`                         | stat < threshold check                               |
| Surrounded check | `surroundedByMoreNotSelf.ts`           | surrounded by N+ opposition                          |
| Uncaptured tile  | `uncapturedTile.ts`                    | nearest uncaptured objective                         |
| State narrowing  | `narrowStateFromPreviousConditions.ts` | chain condition results                              |

### Bot Actions (`src/systems/bot-planner/actions/`)

| Action           | File                                        |
| ---------------- | ------------------------------------------- |
| Engage target    | `engage-target/engageTargetAction.ts`       |
| Retreat          | `retreat/retreatAction.ts`                  |
| Consume item     | `consumeItemAction.ts`                      |
| Place item       | `placeItemAction.ts`                        |
| Use skill        | `useSkillAction.ts`                         |
| Pursue objective | `pursue-objective/pursueObjectiveAction.ts` |

### Bot Scoring (`src/systems/bot-planner/scoring/`)

| Scorer              | File                                   |
| ------------------- | -------------------------------------- |
| Engage              | `scoreEngageAction.ts`                 |
| Retreat             | `scoreRetreatAction.ts`                |
| Item use            | `scoreItemAction.ts`                   |
| Place item          | `scorePlaceItemAction.ts`              |
| Skill use           | `scoreSkillAction.ts`                  |
| Pursue objective    | `scorePursueObjectiveAction.ts`        |
| Score factory       | `createActionScore.ts`                 |
| Scoring constants   | `constants.ts`                         |
| Path blocking value | `evaluators/scorePathBlockingValue.ts` |
| Zone control value  | `evaluators/scoreZoneControlValue.ts`  |

## Turn System

### Turn Management

| Concept             | File                                          | Key Export                                 |
| ------------------- | --------------------------------------------- | ------------------------------------------ |
| Next turn watcher   | `src/systems/game/next-turn/index.ts`         | `watchNextTurn`                            |
| Calculate next turn | `src/systems/game/next-turn/getNextTurn.ts`   | `getNextTurn` (player -> neutral -> enemy) |
| Set next player     | `src/systems/game/next-turn/setNextPlayer.ts` | `setNextPlayer`                            |
| Game state reducer  | `src/state/game/reducer.ts`                   | turn/phase state                           |
| Game actions        | `src/state/game/actions.ts`                   | `nextTurn`, `nextTurnOk`, etc.             |
| Turn selectors      | `src/state/game/selectors/selectGameTurn.ts`  | `selectGameTurn`, `selectGameTurnCount`    |

### Turn Lifecyclers (run at turn boundaries)

| Lifecycler            | File                                                           | Purpose                             |
| --------------------- | -------------------------------------------------------------- | ----------------------------------- |
| Stat modifier expiry  | `src/systems/game/next-turn/statModifierLifecycler.ts`         | Decrement/remove buffs & debuffs    |
| Condition expiry      | `src/systems/game/next-turn/conditionLifecycler.ts`            | Decrement/remove status effects     |
| Skill cooldowns       | `src/systems/game/next-turn/skillCdLifecycler.ts`              | Decrement cooldowns                 |
| Light source expiry   | `src/systems/game/next-turn/lightSourceLifecycler.ts`          | Expire light mechanisms             |
| Environmental effects | `src/systems/game/next-turn/environmentalEffectsLifecycler.ts` | Propagation, duration, interactions |
| Expired units         | `src/systems/game/next-turn/expiredUnitsLifecycler.ts`         | Remove expired units                |
| Water cleansing       | `src/systems/game/next-turn/waterCleansingLifecycler.ts`       | Cleanse burning DoTs on water tiles |
| Scheduled effects     | `src/systems/game/next-turn/scheduledEffects.ts`               | Execute recurring damage/healing    |
| Target score decay    | `src/systems/game/next-turn/targetScoreDecayEffect.ts`         | Decay bot target preferences        |

## Movement & Pathfinding

### Pathfinding (`src/utils/pathfinder/`)

| Concept                          | File                                       | Key Export                      |
| -------------------------------- | ------------------------------------------ | ------------------------------- |
| A\* pathfinding                  | `findPath.ts`                              | `findPath`, `createPath`        |
| BFS flood fill (reachable tiles) | `floodFill.ts`                             | `floodFill`                     |
| Attackable tiles                 | `findAttackableTiles.ts`                   | `findAttackableTiles`           |
| Find closest unit                | `findTarget.ts`                            | `findClosest`                   |
| Adjacent tiles                   | `getAdjacentTiles.ts`                      | `getAdjacentTiles` (4 cardinal) |
| Tile lookup                      | `getTileAtPosition.ts`                     | `getTileAtPosition`             |
| Tile occupant                    | `getTileOccupant.ts`                       | `getTileOccupant`               |
| Heuristics (Manhattan, etc.)     | `heuristics.ts`                            | `heuristics`                    |
| Material movement costs          | `materialCosts.ts`                         | `calculateMaterialMovementCost` |
| Trait-adjusted costs             | `traitMovementCosts.ts`                    | `getTraitAdjustedMovementCost`  |
| Threat zones                     | `threatCones.ts`                           | `threatCones`                   |
| Line of sight                    | `lineAlgos.ts`                             | raycasting functions            |
| Env modifier board               | `createBoardWithEnvironmentalModifiers.ts` | pathfinding with env effects    |
| Mechanism obstacles              | `createBoardWithMechanismObstacles.ts`     | pathfinding with obstacles      |

### Movement System (`src/systems/game/movement/`)

| Concept                | File                            | Key Export              |
| ---------------------- | ------------------------------- | ----------------------- |
| Movement saga          | `movementSystem.ts`             | `movementSystem`        |
| Movement watchers      | `index.ts`                      | coordination            |
| Placed item triggers   | `placedItemEffect.ts`           | trigger on step         |
| Mechanism teleport     | `linkMechanismTeleportation.ts` | teleport between links  |
| Post-movement triggers | `triggersAfterMovement.ts`      | tile effects after move |

## Environmental Effects

| Concept                                  | File                                                                 | Key Export                 |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------- |
| Env effects reducer                      | `src/state/environmental-effects/reducer.ts`                         | state slice                |
| Env effects actions                      | `src/state/environmental-effects/actions.ts`                         | action creators            |
| Light bridge (fire/consecrated -> light) | `src/systems/game/environmental-effects/environmentalLightBridge.ts` | `environmentalLightBridge` |
| Lifecycle (propagation, expiry)          | `src/systems/game/next-turn/environmentalEffectsLifecycler.ts`       | turn-based processing      |

## Win Conditions

| Concept                 | File                                                             | Key Export                           |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| Root win condition saga | `src/systems/win-conditions/rootSaga.ts`                         | `winConditionsRootSaga`              |
| Loss conditions         | `src/systems/win-conditions/lossConditionHandler.ts`             | `watchForAllLossConditions`          |
| Win condition bridge    | `src/systems/win-conditions/winConditionReducerBridge.ts`        | `watchWinConditionBridge`            |
| Gather conditions       | `src/systems/win-conditions/gatherConditionChecker.ts`           | `watchGatherConditions`              |
| Victory finalization    | `src/systems/win-conditions/victoryFinalizer.ts`                 | `watchVictoryFinalization`           |
| Status monitoring       | `src/systems/win-conditions/conditionStatusMonitoring.ts`        | `watchConditionStatusUpdates`        |
| Condition validator     | `src/systems/win-conditions/conditionValidator.ts`               | `validateWinConditions`              |
| Progress selectors      | `src/state/game/selectors/selectWinConditionProgress.ts`         | `selectWinConditionProgress`, etc.   |
| Capture progress        | `src/state/game/selectors/selectCaptureConditionTileProgress.ts` | `selectCaptureConditionTileProgress` |

## Vision & Fog of War

| Concept                   | File                                             | Key Export                                        |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Fog, vision, illumination | `src/state/game/selectors/selectFogOfWar.ts`     | `selectFogTiles`, `selectIlluminationTiles`, etc. |
| Influence/threat maps     | `src/state/game/selectors/selectInfluenceMap.ts` | `selectInfluenceMap`, `selectThreatConesForUnits` |

## Orchestration

| Concept                  | File                                                             | Key Export                     |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------ |
| Root saga (all watchers) | `src/systems/rootSaga.ts`                                        | `rootSaga`                     |
| Change effect manager    | `src/systems/game/change-effect-manager/index.ts`                | `changeEffectManager`          |
| Compute change actions   | `src/systems/game/change-effect-manager/computeChangeActions.ts` | stat mod computation           |
| Core type definitions    | `src/type-definitions/types.ts`                                  | `RootState` and all game types |
