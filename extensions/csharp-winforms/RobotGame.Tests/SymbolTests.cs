using RobotGame.Core;
using RobotGame.Core.Characters;
using RobotGame.Core.Symbols;
using Xunit;

namespace RobotGame.Tests;

public class SymbolTests
{
    [Fact]
    public void Wall_BlocksEntry()
    {
        var wall = new Wall(Wall.Piece.Vertical);
        Assert.False(wall.Enter(new Player()));
    }

    [Fact]
    public void Floor_AllowsEntry()
    {
        var floor = new Floor();
        Assert.True(floor.Enter(new Player()));
    }

    [Fact]
    public void Door_RequiresTwoEntriesToPass()
    {
        var door = new Door(opensVertically: true);
        var player = new Player();

        Assert.False(door.Enter(player)); // first entry opens it
        Assert.True(door.Enter(player));  // second entry passes
    }

    [Fact]
    public void LockedDoor_WithoutKey_StaysClosed()
    {
        var key = SeedData.CreateItem(592);
        var door = new LockedDoor(opensVertically: false, key: key);
        var player = new Player(); // no key

        Assert.False(door.Enter(player));
        Assert.False(door.Enter(player)); // still closed without key
    }

    [Fact]
    public void LockedDoor_WithKey_OpensAndPasses()
    {
        var key = SeedData.CreateItem(592);
        var door = new LockedDoor(opensVertically: false, key: key);
        var player = new Player();
        player.AddItem(key);

        Assert.False(door.Enter(player)); // opens
        Assert.True(door.Enter(player));  // passes
    }

    [Fact]
    public void Treasure_CollectedOnce_RespectsDuplicateCheck()
    {
        var item = SeedData.CreateItem(800); // Diamond
        var treasure = new Treasure(item);
        var player = new Player();

        treasure.Enter(player);
        Assert.Contains(item, player.Inventory);
        Assert.False(treasure.Visible);

        // A second, identical treasure should not be collectible because the player already holds it.
        var dup = new Treasure(SeedData.CreateItem(800));
        dup.Enter(player);
        Assert.Equal(1, player.Inventory.Count(i => i.TileId == 800));
    }

    [Fact]
    public void Treasure_RespectsCapacity()
    {
        var treasure = new Treasure(SeedData.CreateItem(800));
        var ant = new Ant(); // capacity 0

        treasure.Enter(ant);
        Assert.Empty(ant.Inventory);
        Assert.True(treasure.Visible);
    }

    [Fact]
    public void Treasure_RaisesCollectedEvent()
    {
        var treasure = new Treasure(SeedData.CreateItem(700));
        bool raised = false;
        treasure.Collected += (_, _) => raised = true;

        treasure.Enter(new Player());
        Assert.True(raised);
    }
}
