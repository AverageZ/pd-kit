# Content Templates

Templates for level design lore content. Use these as starting points and adapt to specific needs.

## Scene Template

```markdown
## [Scene Name]

**Location**: [Where this takes place]
**Characters**: [Who is present]
**Trigger**: [What gameplay event triggers this scene]
**Purpose**: [What this scene accomplishes narratively]

---

[STAGE DIRECTION: Brief description of visual setup]

**[CHARACTER NAME]**: [Dialogue]

[STAGE DIRECTION: Character action or reaction]

**[CHARACTER NAME]**: [Response]

---

**Player Choice** (if applicable):

- Option A: [Choice text] → [Consequence]
- Option B: [Choice text] → [Consequence]
```

### Scene Example

```markdown
## Disputed Crossing

**Location**: Bridge at Thornbrook Ford
**Characters**: Captain Maren, Sergeant Voldt, Player Unit
**Trigger**: Player approaches bridge tile
**Purpose**: Establish local politics, introduce tollkeeper conflict

---

[STAGE DIRECTION: Two soldiers block the narrow bridge. One holds a toll banner.]

**SERGEANT VOLDT**: Toll's three marks. Confederation standard.

[STAGE DIRECTION: Captain Maren steps forward, hand on sword hilt]

**CAPTAIN MAREN**: We're on garrison business. The Lord Mayor's writ should cover passage.

**SERGEANT VOLDT**: [Shrugs] Lord Mayor's writ, Lord Mayor's bridge. This here's Thornbrook land. Three marks.

---

**Player Choice**:

- Pay the toll: "Fine. Three marks." → Lose 3 marks, avoid conflict
- Challenge: "Check your charter. Garrison movement is exempt." → Skill check, potential combat
- Intimidate: [Requires military background] "Step aside, or explain to Lord Thornbrook why his bridge burned." → Potential combat, reputation change
```

## Combat Chatter Template

```markdown
## [Unit Class] Combat Chatter

### Attack Initiated

1. "[Line]"
2. "[Line]"
3. "[Line]"

### Hit Landed

1. "[Line]"
2. "[Line]"
3. "[Line]"

### Critical Hit

1. "[Line]"
2. "[Line]"

### Miss

1. "[Line]"
2. "[Line]"

### Taking Damage

1. "[Line]"
2. "[Line]"
3. "[Line]"

### Near Death (< 25% HP)

1. "[Line]"
2. "[Line]"

### Ally Down

1. "[Line]"
2. "[Line]"

### Enemy Down

1. "[Line]"
2. "[Line]"
3. "[Line]"
```

### Combat Chatter Example: Mercenary

```markdown
## Mercenary Combat Chatter

### Attack Initiated

1. "Earning my pay."
2. "On it."
3. "Moving in."

### Hit Landed

1. "Clean hit."
2. "That's the job."
3. "Solid."

### Critical Hit

1. "That's why you pay premium."
2. "Won't need a second swing."

### Miss

1. "Slippery."
2. "They're good."

### Taking Damage

1. _grunt_
2. "Still standing."
3. "That'll cost extra."

### Near Death

1. "This wasn't in the contract..."
2. "Need support here."

### Ally Down

1. "We've lost one. Keep moving."
2. "Damn."

### Enemy Down

1. "One down."
2. "Next."
3. "Confirmed."
```

### Combat Chatter Example: Cleric

```markdown
## Cleric Combat Chatter

### Attack Initiated

1. "Forgive what follows."
2. "By necessity."
3. "So be it."

### Hit Landed

1. "May it end quickly."
2. "Mercy in swift strokes."

### Critical Hit

1. "The light guides my hand."
2. "A clean end."

### Miss

1. "They are not ready."
2. "Another chance, then."

### Taking Damage

1. "I am tested."
2. "Pain passes."
3. _sharp breath_

### Near Death

1. "My faith... wavers not."
2. "Healing... needed."

### Ally Down

1. "Go gently to what waits."
2. "Their burden is lifted."

### Enemy Down

1. "Rest now."
2. "It is done."
3. "May you find peace."
```

## Unit Bark Template

```markdown
## [Unit Class] Barks

### Selection (when clicked)

1. "[Line]"
2. "[Line]"
3. "[Line]"

### Movement Ordered

1. "[Line]"
2. "[Line]"
3. "[Line]"

### Movement Complete

1. "[Line]"
2. "[Line]"

### Waiting/Idle (after 10+ seconds no orders)

1. "[Line]"
2. "[Line]"

### Low Health Warning

1. "[Line]"
2. "[Line]"

### Buff Received

1. "[Line]"
2. "[Line]"

### Debuff Received

1. "[Line]"
2. "[Line]"
```

### Bark Example: Rogue

```markdown
## Rogue Barks

### Selection

1. "What's the angle?"
2. "Listening."
3. "Something subtle?"

### Movement Ordered

1. "Quiet like."
2. "On my way."
3. "Through the shadows."

### Movement Complete

1. "In position."
2. "Here."

### Waiting/Idle

1. "Getting stiff here."
2. "Patience isn't free."

### Low Health Warning

1. "Getting dicey."
2. "Need to pull back."

### Buff Received

1. "Nice edge."
2. "That'll help."

### Debuff Received

1. "Something's wrong."
2. "Feeling sluggish."
```

## Level Description Template

```markdown
## [Level/Mission Name]

**Setting**: [1-2 sentences establishing the physical location and atmosphere]

**Context**: [1-2 sentences explaining why the player is here and recent events]

**Stakes**: [1 sentence on consequences of failure]

**Tactical Note** (optional): [Brief note on relevant combat considerations]
```

### Level Description Example

```markdown
## The Thornbrook Crossing

**Setting**: A narrow stone bridge spans the swollen waters of Thornbrook Ford. Autumn rains have made the banks treacherous, funneling all traffic to this single crossing.

**Context**: Lord Thornbrook's men have been collecting "emergency tolls" here for weeks, straining relations with the garrison. Captain Maren's patrol was sent to investigate, but hasn't reported back.

**Stakes**: If the crossing remains blocked, supply lines to Greyfen's eastern districts will fail before winter.

**Tactical Note**: The bridge is only two units wide. Ranged support from the banks is limited by the elevation drop.
```

### Level Description Example: Combat Mission

```markdown
## Warehouse District Raid

**Setting**: Pre-dawn in Greyfen's warehouse district. Fog rolls in from the river, reducing visibility between the tightly-packed storage buildings.

**Context**: Intelligence suggests the smuggling ring uses warehouse twelve as their distribution point. The night watch has been... convinced to patrol elsewhere for the next hour.

**Stakes**: If the smugglers escape with tonight's shipment, the trail goes cold and the Mercantile Houses lose leverage in the upcoming trade negotiations.

**Tactical Note**: Fog limits visibility to four tiles. Multiple entry points available, but interior layout is unknown until scouted.
```

## Fragment Format (For Undeveloped Ideas)

Use this format when capturing ideas that aren't fully developed:

```markdown
### [Brief Title]

- **Type**: [scene/chatter/bark/description]
- **Context**: [When/where this would be used]
- **Core idea**: [1-2 sentences capturing the concept]
- **Voice/Character**: [Who speaks, if applicable]
- **Status**: [idea/draft/ready-to-develop]
```

### Fragment Example

```markdown
### Mercenary's Morning Complaint

- **Type**: chatter/bark
- **Context**: Mission start, early morning
- **Core idea**: Professional soldier complaining about early starts in a way that reveals their background
- **Voice/Character**: Mercenary class, any faction
- **Status**: idea

"Dawn raids. Always dawn raids. Nobody ever wants a nice afternoon siege."
```
