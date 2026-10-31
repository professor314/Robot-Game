namespace RobotGame.Core.Symbols;

/// <summary>
/// A pickup on the floor holding a single item. When a character with spare capacity enters
/// and does not already hold an equal item, the item is added to their inventory and the
/// treasure becomes invisible. A <see cref="Collected"/> event lets the world remove it from
/// the map (replacing the original's database delete).
/// </summary>
public sealed class Treasure : ISymbol
{
    private readonly Item _item;

    /// <summary>True until the treasure has been collected.</summary>
    public bool Visible { get; private set; } = true;

    /// <summary>Raised once, when the treasure is collected.</summary>
    public event EventHandler? Collected;

    /// <summary>Create treasure holding the given item.</summary>
    public Treasure(Item item) => _item = item;

    public TileColor Color => TileColor.DarkGray;

    public int? TileId => Visible ? _item.TileId : null;

    public bool Enter(Character character)
    {
        if (Visible && character.HasCapacityRemaining() && !character.HasItem(_item))
        {
            character.AddItem(_item);
            Visible = false;
            Collected?.Invoke(this, EventArgs.Empty);
        }

        // Treasure sits on floor; entry is always allowed.
        return true;
    }
}
