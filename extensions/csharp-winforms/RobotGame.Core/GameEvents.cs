namespace RobotGame.Core;

/// <summary>Base type for all observable game events raised through <see cref="GameWorld"/>.</summary>
public abstract record GameEvent;

/// <summary>Raised when a character's HP changes. <see cref="Delta"/> is the signed change.</summary>
public sealed record HpChangedEvent(Character Character, int Delta, int NewHp) : GameEvent;

/// <summary>Raised when an item is added to a character's inventory.</summary>
public sealed record ItemPickedUpEvent(Character Character, Item Item) : GameEvent;

/// <summary>Raised when an item is removed from a character's inventory.</summary>
public sealed record ItemDroppedEvent(Character Character, Item Item) : GameEvent;

/// <summary>Raised when a character's active (equipped) item changes. Null item = unequipped.</summary>
public sealed record ActiveItemChangedEvent(Character Character, Item? Item) : GameEvent;

/// <summary>Raised when one character attacks another.</summary>
public sealed record AttackEvent(string Attacker, string Target, int DamageDealt) : GameEvent;

/// <summary>Raised when a character dies (HP reaches zero).</summary>
public sealed record CharacterDiedEvent(Character Character) : GameEvent;
