namespace RobotGame.Core.Symbols;

/// <summary>
/// A door that requires a specific key item. A character with the key behaves as if using a
/// normal door (two-step open/pass); without the key, the door never opens and only allows
/// passage if it was already open.
/// </summary>
public sealed class LockedDoor : Door
{
    private readonly Item _key;

    /// <summary>Create a locked door requiring the given key item.</summary>
    public LockedDoor(bool opensVertically, Item key) : base(opensVertically)
    {
        _key = key;
    }

    public override bool Enter(Character character)
    {
        if (character.HasItem(_key))
            return base.Enter(character);

        // No key: only passable if some prior keyed entry already opened it.
        return IsOpen;
    }
}
