using RobotGame.Core;
using RobotGame.Core.Characters;
using RobotGame.Core.Symbols;
using Xunit;

namespace RobotGame.Tests;

public class MovementTests
{
    [Fact]
    public void MoveIntoFloor_MovesCharacter()
    {
        var map = new Map(15);
        map[5, 5] = new Floor();
        var player = new Player { Position = new GridPoint(5, 6) };
        map.Characters.Add(player);
        var world = new GameWorld(map, player, new Random(1));

        world.MoveCharacter(player, new GridPoint(5, 5));
        Assert.Equal(new GridPoint(5, 5), player.Position);
    }

    [Fact]
    public void MoveIntoWall_Blocked()
    {
        var map = new Map(15);
        map[5, 5] = new Wall(Wall.Piece.Vertical);
        var player = new Player { Position = new GridPoint(5, 6) };
        map.Characters.Add(player);
        var world = new GameWorld(map, player, new Random(1));

        world.MoveCharacter(player, new GridPoint(5, 5));
        Assert.Equal(new GridPoint(5, 6), player.Position);
    }

    [Fact]
    public void MoveIntoEmptyCell_Moves_FixesOriginalBug()
    {
        // Original bug: entering a null (empty) cell left the character in place.
        // The fix treats open empty space as walkable.
        var map = new Map(15); // all cells null
        var player = new Player { Position = new GridPoint(5, 6) };
        map.Characters.Add(player);
        var world = new GameWorld(map, player, new Random(1));

        world.MoveCharacter(player, new GridPoint(5, 5));
        Assert.Equal(new GridPoint(5, 5), player.Position);
    }

    [Fact]
    public void MoveOutOfBounds_Ignored()
    {
        var map = new Map(15);
        var player = new Player { Position = new GridPoint(0, 0) };
        map.Characters.Add(player);
        var world = new GameWorld(map, player, new Random(1));

        world.MoveCharacter(player, new GridPoint(-1, 0));
        Assert.Equal(new GridPoint(0, 0), player.Position);
    }

    [Fact]
    public void SeededWorld_BuildsWithoutDatabase()
    {
        var world = SeedData.CreateWorld(new Random(1));
        Assert.Equal(SeedData.MapSize, world.Map.Size);
        Assert.Equal(new GridPoint(4, 3), world.Player.Position);
        Assert.Equal(2, world.MovingEnemies.Count); // Ant + Cthulhu
    }

    [Fact]
    public void EnemyTurn_AdjacentEnemyAttacksPlayer()
    {
        var map = new Map(15);
        for (int x = 0; x < 15; x++)
            for (int y = 0; y < 15; y++)
                map[x, y] = new Floor();

        var player = new Player { Position = new GridPoint(5, 5) };
        player.HP = 2;
        map.Characters.Add(player);
        var world = new GameWorld(map, player, new Random(1));

        var cthulhu = new Cthulhu { Position = new GridPoint(5, 6) }; // adjacent
        world.AddEnemy(cthulhu);

        int before = player.HP;
        world.EnemyTurn();
        Assert.True(player.HP < before); // the adjacent enemy chose to attack
    }
}
