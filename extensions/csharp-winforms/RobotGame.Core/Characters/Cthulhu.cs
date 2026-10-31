namespace RobotGame.Core.Characters;

/// <summary>A powerful enemy. Stats preserved from the original.</summary>
public sealed class Cthulhu : Character
{
    private const int EnemyTile = 50;

    public override string Name => "Cthulhu";
    public override int TileId => EnemyTile;
    public override int Capacity => 0;
    public override int Level => 5;
    public override int MaxHp => 35;

    /// <summary>Unarmed damage is 1.5 points per level, rounded.</summary>
    public override int UnarmedDamage => (int)Math.Round(Level * 1.5, 0);
}
