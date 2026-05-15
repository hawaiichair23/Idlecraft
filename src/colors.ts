// Named colors used throughout the game. Hex numbers Phaser wants, not strings.
export const COLORS = {
  // world & background
  worldBg: 0xF5F0E1,        // cream
  worldBorder: 0xC8C0AA,    // warm grey

  // plots
  plotFill: 0xE8E0CC,       // slightly darker cream
  plotBorder: 0xC8C0AA,     // warm grey
  plotPriceTag: 0x6B5D4F,   // dark warm gray, for "$" on empty plots
  craftSymbol: 0x9A8B7A,    // lighter gray than $, for + and arrow in crafter panel

  // ui (placeholders for later)
  uiBarBg: 0x2A2520,        // dark bar bg
  uiBarFill: 0xFFD700,      // gold
  uiText: 0xF5F0E1,         // light cream text
  uiGold: 0xDAA520,         // dark gold, for the gold counter

  // progress bar on a building plot
  progressBg: 0x333333,     // dark track
  progressFill: 0xDAA520,   // gold fill

  // menu — disabled (unaffordable) row text
  menuDisabled: 0xD8D2C0,   // cool light gray-cream

  // slot hover — applied as a tint (multiply) to brighten the slot + its
  // contents when the pointer is over it. Slightly above white-tint to keep
  // a faint warm cast.
  slotHover: 0xFFFFE8,

  // interior panel tint — applied to 9-slice backgrounds inside buildings
  interiorPanel: 0x8A8690,
}
