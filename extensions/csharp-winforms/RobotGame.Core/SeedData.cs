namespace RobotGame.Core;

using RobotGame.Core.Characters;
using RobotGame.Core.Symbols;

/// <summary>
/// Builds the initial dungeon entirely in code, replacing the original's SQL Server database.
/// The room/hall layout comes from the original <c>Form1_Load</c>; the treasure placements come
/// from the block the original had commented out (its intended item layout); the enemy roster
/// matches the original database rows (one Ant, one Cthulhu).
/// </summary>
public static class SeedData
{
    /// <summary>The map side length used by the original game.</summary>
    public const int MapSize = 15;

    /// <summary>Factory for the known items/weapons, keyed by tile id (from the original CreateItem).</summary>
    public static Item CreateItem(int tileId) => tileId switch
    {
        600 => new Item("camera", 600),
        450 => new Weapon("Mace", 450, 5),
        455 => new Weapon("staff", 455, 3),
        755 => new Item("SpellBook", 755),
        800 => new Item("Diamond", 800),
        700 => new Item("Scroll", 700),
        592 => new Item("Key", 592),
        _ => throw new ArgumentOutOfRangeException(nameof(tileId), $"Unknown item tile id {tileId}."),
    };

    /// <summary>
    /// Construct a fully seeded world: rooms, halls, locked door, treasure, player, and enemies.
    /// </summary>
    /// <param name="rng">Optional seeded RNG for deterministic enemy movement.</param>
    public static GameWorld CreateWorld(Random? rng = null)
    {
        var map = new Map(MapSize);

        // Rooms (from the original Form1_Load).
        map.CreateRoom(new GridPoint(1, 2), new GridPoint(5, 4));
        map.CreateRoom(new GridPoint(8, 1), new GridPoint(11, 13));
        map.CreateRoom(new GridPoint(2, 9), new GridPoint(4, 11));

        // Halls.
        map.CreateHall(new GridPoint(3, 4), new GridPoint(3, 9));
        map.CreateHall(new GridPoint(5, 3), new GridPoint(8, 3));

        var player = new Player { Position = new GridPoint(4, 3) };
        var world = new GameWorld(map, player, rng);
        map.Characters.Add(player);

        // Treasure placements (from the original's commented-out block).
        PlaceTreasure(world, 3, 10, 600);  // camera
        PlaceTreasure(world, 3, 7, 600);   // camera
        PlaceTreasure(world, 10, 5, 450);  // Mace
        PlaceTreasure(world, 10, 7, 455);  // staff
        PlaceTreasure(world, 10, 10, 755); // SpellBook
        PlaceTreasure(world, 9, 9, 800);   // Diamond
        PlaceTreasure(world, 10, 8, 700);  // Scroll
        PlaceTreasure(world, 3, 5, 592);   // Key
        PlaceTreasure(world, 10, 4, 450);  // Mace

        // Locked door needing the Key (overwrites the hall door at (5,3)).
        map[5, 3] = new LockedDoor(opensVertically: false, key: CreateItem(592));

        // Enemies (original database rows: one Ant, one Cthulhu).
        var cthulhu = new Cthulhu { Position = new GridPoint(10, 6) };
        world.AddEnemy(cthulhu);

        var ant = new Ant { Position = new GridPoint(3, 6) };
        world.AddEnemy(ant);

        return world;
    }

    private static void PlaceTreasure(GameWorld world, int x, int y, int tileId)
    {
        var treasure = new Treasure(CreateItem(tileId));
        // When collected, remove the treasure from the map (replaces the original DB delete).
        treasure.Collected += (_, _) =>
        {
            GridPoint? pos = world.Map.FindSymbol(treasure);
            if (pos is { } p) world.Map[p.X, p.Y] = new Floor();
        };
        world.Map[x, y] = treasure;
    }
}
