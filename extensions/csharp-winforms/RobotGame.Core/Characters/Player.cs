namespace RobotGame.Core.Characters;

/// <summary>The player character. Stats preserved from the original (Indiana-Jones-like sprite).</summary>
public sealed class Player : Character
{
    private const int PlayerTile = 335;

    public override string Name => "The Player";
    public override int TileId => PlayerTile;
    public override int Capacity => 5;
    public override int Level => 1;
    public override int MaxHp => 10;

    /// <summary>Unarmed damage is 3 points per level.</summary>
    public override int UnarmedDamage => Level * 3;
}
