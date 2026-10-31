namespace RobotGame.Core;

/// <summary>
/// An item that deals a fixed amount of damage when used to attack.
/// (The original called this <c>SimpleWeapon</c>.)
/// </summary>
public class Weapon : Item
{
    private readonly int _damage;

    /// <summary>Create a weapon with a name, tile id, and per-hit damage.</summary>
    public Weapon(string name, int tileId, int damage) : base(name, tileId)
    {
        _damage = damage;
    }

    /// <summary>
    /// Deal this weapon's damage to the target, clamped so the target's HP never drops
    /// below zero. Returns the amount of damage actually dealt.
    /// </summary>
    public override int Attack(Character target)
    {
        int dealt = Math.Min(_damage, target.HP);
        target.HP -= dealt;
        return dealt;
    }
}
