namespace RobotGame.Core;

/// <summary>
/// A map cell occupant. Every cell on the <see cref="Map"/> is either empty (null)
/// or holds a symbol that defines its appearance and whether a character may enter it.
/// </summary>
public interface ISymbol
{
    /// <summary>The background color the cell renders with.</summary>
    TileColor Color { get; }

    /// <summary>
    /// The tile id to draw on top of the background, or <c>null</c> for no overlay tile.
    /// </summary>
    int? TileId { get; }

    /// <summary>
    /// Attempt to enter this cell. Returns <c>true</c> if the character may occupy the
    /// cell as a result of this call, or <c>false</c> if entry is blocked. Implementations
    /// may have side effects (e.g. a door opening, treasure being collected).
    /// </summary>
    bool Enter(Character character);
}
