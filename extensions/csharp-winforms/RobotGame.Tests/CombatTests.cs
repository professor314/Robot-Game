using RobotGame.Core;
using RobotGame.Core.Characters;
using Xunit;

namespace RobotGame.Tests;

public class CombatTests
{
    [Fact]
    public void UnarmedAttack_DealsLevelScaledDamage()
    {
        var player = new Player();   // unarmed = 3 * level(1) = 3
        var target = new Cthulhu();  // HP 35
        player.Attack(target);
        Assert.Equal(32, target.HP);
    }

    [Fact]
    public void WeaponAttack_DealsWeaponDamage()
    {
        var player = new Player();
        var mace = new Weapon("Mace", 450, 5);
        player.AddItem(mace);
        player.ActiveItem = mace;

        var target = new Cthulhu(); // HP 35
        player.Attack(target);
        Assert.Equal(30, target.HP);
    }

    [Fact]
    public void Damage_NeverDropsHpBelowZero()
    {
        var player = new Player();
        var mace = new Weapon("Mace", 450, 5);
        player.AddItem(mace);
        player.ActiveItem = mace;

        var ant = new Ant(); // HP 3
        player.Attack(ant);  // 5 damage vs 3 HP
        Assert.Equal(0, ant.HP);
    }

    [Fact]
    public void Hp_ClampedToMax()
    {
        var player = new Player(); // MaxHP 10
        player.HP = 999;
        Assert.Equal(10, player.HP);
    }

    [Fact]
    public void Attack_RaisesAttackEvent_ViaWorld()
    {
        var world = SeedData.CreateWorld(new Random(1));
        AttackEvent? seen = null;
        world.GameEventRaised += (_, e) => { if (e is AttackEvent a) seen = a; };

        var ant = new Ant { Position = new GridPoint(0, 0) };
        world.AddEnemy(ant);
        world.Player.Attack(ant);

        Assert.NotNull(seen);
        Assert.Equal("The Player", seen!.Attacker);
        Assert.Equal("Ant", seen.Target);
    }

    [Fact]
    public void EnemyDeath_RemovesFromMapAndRoster()
    {
        var map = new Map(15);
        var player = new Player { Position = new GridPoint(5, 5) };
        map.Characters.Add(player);
        var world = new GameWorld(map, player, new Random(1));

        var ant = new Ant { Position = new GridPoint(5, 6) };
        world.AddEnemy(ant);

        // Equip a weapon that one-shots the ant, then bump into it.
        var mace = new Weapon("Mace", 450, 5);
        player.AddItem(mace);
        player.ActiveItem = mace;

        world.MoveCharacter(player, new GridPoint(5, 6)); // attack ant
        Assert.DoesNotContain(ant, world.MovingEnemies);
        Assert.DoesNotContain(ant, map.Characters);
    }

    [Fact]
    public void PlayerDeath_EndsGame()
    {
        var map = new Map(15);
        var player = new Player { Position = new GridPoint(5, 5) };
        map.Characters.Add(player);
        var world = new GameWorld(map, player, new Random(1));

        player.HP = 1;
        var cthulhu = new Cthulhu { Position = new GridPoint(5, 6) };
        world.AddEnemy(cthulhu);

        // Cthulhu attacks the player by moving onto them.
        world.MoveCharacter(cthulhu, new GridPoint(5, 5));
        Assert.True(world.IsGameOver);
    }
}
