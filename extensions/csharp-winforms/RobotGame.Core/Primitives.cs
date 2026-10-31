namespace RobotGame.Core;

/// <summary>
/// A simple integer grid coordinate. Replaces the original's dependency on
/// <c>System.Drawing.Point</c> so that the core game logic has no UI/graphics dependency.
/// </summary>
public readonly record struct GridPoint(int X, int Y)
{
    /// <summary>Returns a new point offset by the given deltas.</summary>
    public GridPoint Offset(int dx, int dy) => new(X + dx, Y + dy);

    public override string ToString() => $"({X}, {Y})";
}

/// <summary>
/// Logical colors a map cell can render as. The UI layer maps these to concrete
/// <c>System.Drawing.Color</c> values, keeping the core free of graphics types.
/// </summary>
public enum TileColor
{
    /// <summary>Empty / unknown space.</summary>
    Black,
    /// <summary>Walkable floor and most feature cells.</summary>
    DarkGray,
    /// <summary>A character (e.g. an enemy) highlight.</summary>
    Red,
}
