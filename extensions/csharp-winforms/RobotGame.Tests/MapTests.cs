using RobotGame.Core;
using RobotGame.Core.Symbols;
using Xunit;

namespace RobotGame.Tests;

public class MapTests
{
    [Fact]
    public void CreateRoom_PlacesCornersWallsAndFloor()
    {
        var map = new Map(15);
        map.CreateRoom(new GridPoint(1, 2), new GridPoint(5, 4));

        // Corners
        Assert.IsType<Wall>(map[1, 2]);
        Assert.IsType<Wall>(map[5, 2]);
        Assert.IsType<Wall>(map[1, 4]);
        Assert.IsType<Wall>(map[5, 4]);

        // A top-wall cell between the corners is a wall
        Assert.IsType<Wall>(map[3, 2]);
        // A left-wall cell is a wall
        Assert.IsType<Wall>(map[1, 3]);
        // Interior is floor
        Assert.IsType<Floor>(map[3, 3]);
    }

    [Fact]
    public void CreateRoom_InvalidBounds_Throws()
    {
        var map = new Map(15);
        Assert.Throws<ArgumentOutOfRangeException>(
            () => map.CreateRoom(new GridPoint(5, 5), new GridPoint(1, 1)));
    }

    [Fact]
    public void CreateHall_HorizontalPlacesDoorsAtEndsAndFloorBetween()
    {
        var map = new Map(15);
        map.CreateHall(new GridPoint(5, 3), new GridPoint(8, 3));

        Assert.IsType<Door>(map[5, 3]);
        Assert.IsType<Door>(map[8, 3]);
        Assert.IsType<Floor>(map[6, 3]);
        Assert.IsType<Floor>(map[7, 3]);
    }

    [Fact]
    public void CreateHall_NonLinear_Throws()
    {
        var map = new Map(15);
        Assert.Throws<ArgumentOutOfRangeException>(
            () => map.CreateHall(new GridPoint(1, 1), new GridPoint(3, 5)));
    }

    [Theory]
    [InlineData(0, 0, true)]
    [InlineData(14, 14, true)]
    [InlineData(-1, 0, false)]
    [InlineData(0, 15, false)]
    public void PositionValid_RespectsBounds(int x, int y, bool expected)
    {
        var map = new Map(15);
        Assert.Equal(expected, map.PositionValid(new GridPoint(x, y)));
    }

    [Fact]
    public void FindSymbol_ReturnsPosition()
    {
        var map = new Map(15);
        var floor = new Floor();
        map[4, 7] = floor;
        Assert.Equal(new GridPoint(4, 7), map.FindSymbol(floor));
    }
}
