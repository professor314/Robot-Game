namespace RobotGame.Core.Symbols;

/// <summary>Plain walkable floor. No overlay tile; always allows entry.</summary>
public sealed class Floor : ISymbol
{
    public TileColor Color => TileColor.DarkGray;

    public int? TileId => null;

    public bool Enter(Character character) => true;
}
