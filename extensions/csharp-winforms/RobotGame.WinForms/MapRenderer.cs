using RobotGame.Core;

namespace RobotGame.WinForms;

/// <summary>
/// Converts the core <see cref="Map"/> state into the color and image grids the
/// <see cref="FireBox"/> renders. This lives in the UI because it works with
/// <see cref="Color"/> and <see cref="Image"/>, keeping the core graphics-free.
/// </summary>
public sealed class MapRenderer
{
    private readonly Map _map;
    private readonly TileSet _tiles;

    public MapRenderer(Map map, TileSet tiles)
    {
        _map = map;
        _tiles = tiles;
    }

    /// <summary>Build the background color grid, highlighting higher-level characters in red.</summary>
    public Color[,] GetColors()
    {
        int size = _map.Size;
        var colors = new Color[size, size];
        for (int x = 0; x < size; x++)
            for (int y = 0; y < size; y++)
                colors[x, y] = ToColor(_map[x, y]?.Color ?? TileColor.Black);

        // Highlight enemies (characters above the player's level) as in the original.
        if (_map.Characters.Count > 0)
        {
            Character player = _map.Characters[0];
            foreach (Character c in _map.Characters)
                if (c.Level > player.Level)
                    colors[c.Position.X, c.Position.Y] = Color.Red;
        }

        return colors;
    }

    /// <summary>Build the overlay image grid for symbols and characters.</summary>
    public Image?[,] GetImages()
    {
        int size = _map.Size;
        var images = new Image?[size, size];
        for (int x = 0; x < size; x++)
            for (int y = 0; y < size; y++)
            {
                int? tileId = _map[x, y]?.TileId;
                images[x, y] = tileId.HasValue ? _tiles.GetTile(tileId.Value) : null;
            }

        foreach (Character c in _map.Characters)
            images[c.Position.X, c.Position.Y] = _tiles.GetTile(c.TileId);

        return images;
    }

    private static Color ToColor(TileColor c) => c switch
    {
        TileColor.Black => Color.Black,
        TileColor.DarkGray => Color.DarkGray,
        TileColor.Red => Color.Red,
        _ => Color.Black,
    };
}
