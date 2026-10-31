namespace RobotGame.Core.Characters;

/// <summary>A weak enemy. Stats preserved from the original.</summary>
public sealed class Ant : Character
{
    public override string Name => "Ant";
    public override int TileId => 0;
    public override int Capacity => 0;
    public override int Level => 1;
    public override int MaxHp => 3;

    /// <summary>Unarmed damage is one point per level.</summary>
    public override int UnarmedDamage => Level;
}
