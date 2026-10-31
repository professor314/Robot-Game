namespace RobotGame.WinForms;

/// <summary>
/// Slices a sprite sheet into individual tile images addressed by id. Tiles are numbered left
/// to right, then top to bottom. Images are cached. Ported from the original TileSet (the part
/// that must stay in the UI because it deals with <see cref="Image"/>).
/// </summary>
public sealed class TileSet
{
    private readonly Image _source;
    private readonly int _tileWidth;
    private readonly int _tileHeight;
    private readonly Dictionary<Point, Image> _cache = new();

    /// <summary>Create a tile set over a sheet with the given tile dimensions.</summary>
    public TileSet(Image source, int tileWidth, int tileHeight)
    {
        _source = source;
        _tileWidth = tileWidth;
        _tileHeight = tileHeight;
    }

    /// <summary>
    /// Create a tile set over a bitmap, treating <paramref name="transparent"/> as transparent.
    /// The source is cloned so the original image is not modified.
    /// </summary>
    public TileSet(Bitmap source, int tileWidth, int tileHeight, Color transparent)
    {
        var clone = (Bitmap)source.Clone();
        clone.MakeTransparent(transparent);
        _source = clone;
        _tileWidth = tileWidth;
        _tileHeight = tileHeight;
    }

    /// <summary>Number of tile columns.</summary>
    public int Width => _source.Width / _tileWidth;

    /// <summary>Number of tile rows.</summary>
    public int Height => _source.Height / _tileHeight;

    /// <summary>Total number of tiles.</summary>
    public int Count => Width * Height;

    /// <summary>Get the tile image at column <paramref name="x"/>, row <paramref name="y"/>.</summary>
    public Image GetTile(int x, int y)
    {
        if (x < 0 || y < 0 || x >= Width || y >= Height)
            throw new ArgumentOutOfRangeException(nameof(x), "Tile coordinate outside the sheet.");

        var key = new Point(x, y);
        if (_cache.TryGetValue(key, out Image? cached))
            return cached;

        var tile = new Bitmap(_tileWidth, _tileHeight);
        using (Graphics g = Graphics.FromImage(tile))
        {
            var dst = new Rectangle(0, 0, _tileWidth, _tileHeight);
            var src = new Rectangle(x * _tileWidth, y * _tileHeight, _tileWidth, _tileHeight);
            g.DrawImage(_source, dst, src, GraphicsUnit.Pixel);
        }

        _cache[key] = tile;
        return tile;
    }

    /// <summary>Get the tile image by id (counts across, then down).</summary>
    public Image GetTile(int id) => GetTile(id % Width, id / Width);
}
