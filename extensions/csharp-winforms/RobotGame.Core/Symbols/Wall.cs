namespace RobotGame.Core.Symbols;

/// <summary>An impassable wall segment. Tile id selects the wall piece (corner, horizontal, vertical).</summary>
public sealed class Wall : ISymbol
{
    /// <summary>The wall piece variants and their tile ids.</summary>
    public enum Piece
    {
        Vertical = 830,
        Horizontal = 831,
        TopCorner = 832,
        BottomCorner = 834,
    }

    private readonly Piece _piece;

    /// <summary>Create a wall of the given piece type.</summary>
    public Wall(Piece piece) => _piece = piece;

    public TileColor Color => TileColor.Black;

    public int? TileId => (int)_piece;

    /// <summary>Walls always block entry.</summary>
    public bool Enter(Character character) => false;
}
