using System.Collections.ObjectModel;

namespace RobotGame.Core;

/// <summary>
/// Base class for every actor in the dungeon (the player and enemies). Holds HP, an
/// inventory, an optionally equipped active item, and combat behavior. Events (HP change,
/// pickups, attacks) are raised through an injected <see cref="IGameEventSink"/> rather than
/// the original's static event, so multiple worlds/tests do not cross-talk.
/// </summary>
public abstract class Character
{
    /// <summary>Tile id used to render this character.</summary>
    public abstract int TileId { get; }

    /// <summary>Maximum number of items this character can carry.</summary>
    public abstract int Capacity { get; }

    /// <summary>Character level, used to scale unarmed damage and combat ordering.</summary>
    public abstract int Level { get; }

    /// <summary>Damage dealt when attacking without an equipped weapon.</summary>
    public abstract int UnarmedDamage { get; }

    /// <summary>Display name.</summary>
    public abstract string Name { get; }

    /// <summary>Maximum hit points.</summary>
    public abstract int MaxHp { get; }

    private readonly List<Item> _inventory = new();
    private Item? _activeItem;
    private int _hp;

    /// <summary>The event sink events are published through. Set by <see cref="GameWorld"/>.</summary>
    public IGameEventSink? Events { get; set; }

    /// <summary>The character's grid position on the map.</summary>
    public GridPoint Position { get; set; }

    /// <summary>Read-only view of the character's inventory.</summary>
    public ReadOnlyCollection<Item> Inventory => _inventory.AsReadOnly();

    /// <summary>Initialize the character at full HP.</summary>
    protected Character()
    {
        _hp = MaxHp;
    }

    /// <summary>Current hit points. Clamped to the range [0, <see cref="MaxHp"/>].</summary>
    public int HP
    {
        get => _hp;
        set
        {
            int clamped = Math.Clamp(value, 0, MaxHp);
            if (clamped == _hp) return;
            int delta = clamped - _hp;
            _hp = clamped;
            Events?.Raise(new HpChangedEvent(this, delta, _hp));
        }
    }

    /// <summary>The currently equipped item, or null if unarmed.</summary>
    public Item? ActiveItem
    {
        get => _activeItem;
        set
        {
            if (value is not null && !_inventory.Contains(value))
                throw new InvalidOperationException("Cannot equip an item which is not in the inventory.");
            _activeItem = value;
            Events?.Raise(new ActiveItemChangedEvent(this, _activeItem));
        }
    }

    /// <summary>True if this character already holds an equal item.</summary>
    public bool HasItem(Item item) => _inventory.Contains(item);

    /// <summary>True if the inventory has room for another item.</summary>
    public bool HasCapacityRemaining() => _inventory.Count < Capacity;

    /// <summary>Add an item to the inventory and raise a pickup event.</summary>
    public void AddItem(Item item)
    {
        _inventory.Add(item);
        Events?.Raise(new ItemPickedUpEvent(this, item));
    }

    /// <summary>Remove the item at the given inventory index and raise a drop event.</summary>
    public void RemoveItemAt(int index)
    {
        Item item = _inventory[index];
        _inventory.RemoveAt(index);
        if (_activeItem == item) ActiveItem = null;
        Events?.Raise(new ItemDroppedEvent(this, item));
    }

    /// <summary>
    /// Attack the target with the active weapon, or unarmed if none is equipped. Unarmed
    /// damage is <see cref="UnarmedDamage"/>, clamped so target HP does not go below zero.
    /// </summary>
    public void Attack(Character target)
    {
        int dealt;
        if (_activeItem is null)
        {
            dealt = Math.Min(UnarmedDamage, target.HP);
            target.HP -= dealt;
        }
        else
        {
            dealt = _activeItem.Attack(target);
        }

        Events?.Raise(new AttackEvent(Name, target.Name, dealt));
    }
}
