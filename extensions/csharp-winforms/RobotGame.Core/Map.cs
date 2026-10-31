namespace RobotGame.Core;

using RobotGame.Core.Symbols;

/// <summary>
/// The dungeon grid: a square array of <see cref="ISymbol"/> cells plus the list of
/// characters currently on the map. Provides room/hall construction and position queries.
/// Rendering (colors and tile images) is derived by the UI from the symbols and characters.
/// </summary>
public sealed class Map
{
    private readonly ISymbol?[,] _cells;

    /// <summary>The square side length of the map in cells.</summary>
    public int Size { get; }

    /// <summary>Characters currently on the map (index 0 is conventionally the player).</summary>
    public List<Character> Characters { get; } = new();

    /// <summary>Create an empty square map of the given size.</summary>
    public Map(int size)
    {
        if (size <= 0) throw new ArgumentOutOfRangeException(nameof(size));
        Size = size;
        _cells = new ISymbol?[size, size];
    }

    /// <summary>Total number of cells on the map.</summary>
    public int TotalPositions => Size * Size;

    /// <summary>Indexer for the symbol at a cell. Throws if the position is out of range.</summary>
    public ISymbol? this[int x, int y]
    {
        get
        {
            if (!PositionValid(new GridPoint(x, y))) throw new IndexOutOfRangeException();
            return _cells[x, y];
        }
        set
        {
            if (!PositionValid(new GridPoint(x, y))) throw new IndexOutOfRangeException();
            _cells[x, y] = value;
        }
    }

    /// <summary>Get the symbol at a point without bounds checking beyond the array itself.</summary>
    public ISymbol? GetSymbol(GridPoint p) => _cells[p.X, p.Y];

    /// <summary>Return the character occupying the given point, or null if none.</summary>
    public Character? CharacterAt(GridPoint p)
    {
        foreach (Character c in Characters)
            if (c.Position == p) return c;
        return null;
    }

    /// <summary>True if the point lies within the map bounds.</summary>
    public bool PositionValid(GridPoint p)
        => p.X >= 0 && p.X < Size && p.Y >= 0 && p.Y < Size;

    /// <summary>Find the position of a specific symbol instance, or null if not present.</summary>
    public GridPoint? FindSymbol(ISymbol symbol)
    {
        for (int x = 0; x < Size; x++)
            for (int y = 0; y < Size; y++)
                if (ReferenceEquals(_cells[x, y], symbol))
                    return new GridPoint(x, y);
        return null;
    }

    /// <summary>
    /// Build a rectangular room with walls on its border and floor inside. The corners are
    /// placed, then the four walls, then the interior floor.
    /// </summary>
    /// <param name="upperLeft">Upper-left corner (must be up and to the left of lower-right).</param>
    /// <param name="lowerRight">Lower-right corner.</param>
    public void CreateRoom(GridPoint upperLeft, GridPoint lowerRight)
    {
        if (upperLeft.X >= lowerRight.X || upperLeft.Y >= lowerRight.Y
            || !PositionValid(upperLeft) || !PositionValid(lowerRight))
            throw new ArgumentOutOfRangeException(nameof(upperLeft), "Not a valid room location.");

        // Corners
        _cells[upperLeft.X, upperLeft.Y] = new Wall(Wall.Piece.TopCorner);
        _cells[lowerRight.X, upperLeft.Y] = new Wall(Wall.Piece.TopCorner);
        _cells[upperLeft.X, lowerRight.Y] = new Wall(Wall.Piece.BottomCorner);
        _cells[lowerRight.X, lowerRight.Y] = new Wall(Wall.Piece.BottomCorner);

        // Top and bottom walls
        for (int x = upperLeft.X + 1; x < lowerRight.X; x++)
        {
            _cells[x, upperLeft.Y] = new Wall(Wall.Piece.Horizontal);
            _cells[x, lowerRight.Y] = new Wall(Wall.Piece.Horizontal);
        }

        // Left and right walls
        for (int y = upperLeft.Y + 1; y < lowerRight.Y; y++)
        {
            _cells[upperLeft.X, y] = new Wall(Wall.Piece.Vertical);
            _cells[lowerRight.X, y] = new Wall(Wall.Piece.Vertical);
        }

        // Interior floor
        for (int y = upperLeft.Y + 1; y < lowerRight.Y; y++)
            for (int x = upperLeft.X + 1; x < lowerRight.X; x++)
                _cells[x, y] = new Floor();
    }

    /// <summary>
    /// Build a straight hallway between two points that share an X or a Y coordinate. Doors
    /// are placed at both ends and floor runs between them. The door orientation matches the
    /// hallway direction.
    /// </summary>
    public void CreateHall(GridPoint start, GridPoint end)
    {
        if ((start.X != end.X && start.Y != end.Y) || !PositionValid(start) || !PositionValid(end))
            throw new ArgumentOutOfRangeException(nameof(start), "Not a valid hallway specification.");

        if (start.X == end.X)
        {
            // Vertical hall: vertically-opening doors at each end.
            _cells[start.X, start.Y] = new Door(opensVertically: true);
            _cells[end.X, end.Y] = new Door(opensVertically: true);
            for (int y = start.Y + 1; y < end.Y; y++)
                _cells[start.X, y] = new Floor();
        }
        else
        {
            // Horizontal hall: horizontally-opening doors at each end.
            _cells[start.X, start.Y] = new Door(opensVertically: false);
            _cells[end.X, end.Y] = new Door(opensVertically: false);
            for (int x = start.X + 1; x < end.X; x++)
                _cells[x, start.Y] = new Floor();
        }
    }
}
