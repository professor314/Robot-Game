namespace RobotGame.Core.Symbols;

/// <summary>
/// A door. Doors take two entries to pass: the first entry opens the door (changing its
/// tile and returning false, so the character stays put); the second entry allows passage.
/// Orientation selects the open tile (vertical vs. horizontal).
/// </summary>
public class Door : ISymbol
{
    /// <summary>Door tile ids for the closed and open (by orientation) states.</summary>
    protected enum DoorTile
    {
        Closed = 845,
        OpenVertical = 843,
        OpenHorizontal = 842,
    }

    private DoorTile _tile = DoorTile.Closed;

    /// <summary>True once the door has been opened.</summary>
    protected bool IsOpen { get; private set; }

    /// <summary>True if the door opens vertically; false for horizontal.</summary>
    protected bool OpensVertically { get; }

    /// <summary>Create a door. <paramref name="opensVertically"/> selects the open tile.</summary>
    public Door(bool opensVertically) => OpensVertically = opensVertically;

    public TileColor Color => IsOpen ? TileColor.DarkGray : TileColor.Black;

    public int? TileId => (int)_tile;

    /// <summary>
    /// Open the door on first entry (no passage yet); allow passage once open.
    /// </summary>
    public virtual bool Enter(Character character)
    {
        if (!IsOpen)
        {
            IsOpen = true;
            _tile = OpensVertically ? DoorTile.OpenVertical : DoorTile.OpenHorizontal;
            return false;
        }

        return true;
    }
}
