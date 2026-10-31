namespace RobotGame.Core;

/// <summary>
/// A carryable object. Items are value-compared by name and tile id so that an inventory
/// can detect duplicates (the original overloaded <c>==</c> for this purpose).
/// </summary>
public class Item : IEquatable<Item>
{
    /// <summary>The item's display name.</summary>
    public string Name { get; }

    /// <summary>The tile id used to render the item.</summary>
    public int TileId { get; }

    /// <summary>Create an item with a name and tile id.</summary>
    public Item(string name, int tileId)
    {
        Name = name;
        TileId = tileId;
    }

    /// <summary>
    /// Use this item to attack the given character. The base item is not a weapon and
    /// deals no damage; <see cref="Weapon"/> overrides this.
    /// </summary>
    public virtual int Attack(Character target) => 0;

    public bool Equals(Item? other)
        => other is not null && Name == other.Name && TileId == other.TileId;

    public override bool Equals(object? obj) => Equals(obj as Item);

    public override int GetHashCode() => HashCode.Combine(Name, TileId);

    public override string ToString() => Name;

    public static bool operator ==(Item? a, Item? b)
        => a is null ? b is null : a.Equals(b);

    public static bool operator !=(Item? a, Item? b) => !(a == b);
}
