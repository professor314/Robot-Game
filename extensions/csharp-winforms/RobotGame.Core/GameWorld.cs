namespace RobotGame.Core;

using RobotGame.Core.Characters;
using RobotGame.Core.Symbols;

/// <summary>
/// Owns the authoritative game state (map, player, enemies) and the rules for movement,
/// combat, pickups, and the enemy turn. Raises <see cref="GameEvent"/>s to subscribers via
/// <see cref="GameEventRaised"/>. This is the UI-independent heart of the game, ported from
/// the original <c>Form1</c> logic with all database access removed.
/// </summary>
public sealed class GameWorld : IGameEventSink
{
    private readonly Random _rng;

    /// <summary>The dungeon map.</summary>
    public Map Map { get; }

    /// <summary>The player character.</summary>
    public Player Player { get; }

    /// <summary>Enemies that move on each enemy turn.</summary>
    public List<Character> MovingEnemies { get; } = new();

    /// <summary>True once the player has died; the game is over.</summary>
    public bool IsGameOver { get; private set; }

    /// <summary>Raised for every game event (HP changes, pickups, attacks, deaths).</summary>
    public event EventHandler<GameEvent>? GameEventRaised;

    /// <summary>
    /// Create a world around a map and player. A seedable RNG makes enemy movement
    /// deterministic for tests; pass null for a time-seeded RNG in normal play.
    /// </summary>
    public GameWorld(Map map, Player player, Random? rng = null)
    {
        Map = map;
        Player = player;
        _rng = rng ?? new Random();
        Player.Events = this;
    }

    /// <inheritdoc/>
    public void Raise(GameEvent gameEvent) => GameEventRaised?.Invoke(this, gameEvent);

    /// <summary>Add an enemy to the map and the moving-enemy set, wiring its events to this world.</summary>
    public void AddEnemy(Character enemy)
    {
        enemy.Events = this;
        Map.Characters.Add(enemy);
        MovingEnemies.Add(enemy);
    }

    /// <summary>
    /// Attempt to move a character to a destination. If another character is there, resolve an
    /// attack instead of a move. Otherwise, move only if the destination cell allows entry.
    /// Fixes the original bug where moving into an empty (null) cell left the character in place.
    /// </summary>
    public void MoveCharacter(Character character, GridPoint dest)
    {
        if (!Map.PositionValid(dest)) return;

        Character? target = Map.CharacterAt(dest);
        if (target is not null && target != character)
        {
            ResolveAttack(character, target);
            return;
        }

        ISymbol? symbol = Map.GetSymbol(dest);

        // Empty cell: open space, always walkable (original left the player in place here).
        if (symbol is null)
        {
            character.Position = dest;
            return;
        }

        if (symbol.Enter(character))
            character.Position = dest;
    }

    private void ResolveAttack(Character attacker, Character target)
    {
        attacker.Attack(target);

        if (target.HP == 0)
        {
            if (target == Player)
            {
                IsGameOver = true;
                Raise(new CharacterDiedEvent(target));
            }
            else
            {
                MovingEnemies.Remove(target);
                Map.Characters.Remove(target);
                Raise(new CharacterDiedEvent(target));
            }
        }
    }

    /// <summary>
    /// Advance all moving enemies one step. Each enemy moves a random direction, except that
    /// an enemy orthogonally adjacent to the player moves onto the player (attacking).
    /// </summary>
    public void EnemyTurn()
    {
        if (IsGameOver) return;

        // Snapshot: ResolveAttack may remove enemies mid-iteration.
        foreach (Character enemy in MovingEnemies.ToArray())
        {
            if (!MovingEnemies.Contains(enemy)) continue;

            GridPoint dest = _rng.Next(1, 5) switch
            {
                1 => enemy.Position.Offset(0, -1),
                2 => enemy.Position.Offset(0, 1),
                3 => enemy.Position.Offset(-1, 0),
                _ => enemy.Position.Offset(1, 0),
            };

            int manhattan = Math.Abs(Player.Position.X - enemy.Position.X)
                          + Math.Abs(Player.Position.Y - enemy.Position.Y);
            if (manhattan == 1)
                dest = Player.Position;

            MoveCharacter(enemy, dest);
            if (IsGameOver) return;
        }
    }
}
