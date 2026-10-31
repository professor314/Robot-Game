using RobotGame.Core;

namespace RobotGame.WinForms;

/// <summary>
/// A running log of game events (pickups, HP changes, equips, attacks). Subscribes to the
/// world's event stream. Ported from the original frmLog.
/// </summary>
public sealed class LogForm : Form
{
    private readonly ListBox _log = new() { Dock = DockStyle.Fill };
    private readonly GameWorld _world;

    public LogForm(GameWorld world)
    {
        _world = world;

        Text = "Event Log";
        ClientSize = new Size(360, 320);

        var btnClear = new Button { Text = "Clear", Dock = DockStyle.Bottom, Height = 30 };
        btnClear.Click += (_, _) => _log.Items.Clear();

        Controls.Add(_log);
        Controls.Add(btnClear);

        _world.GameEventRaised += OnGameEvent;
        FormClosed += (_, _) => _world.GameEventRaised -= OnGameEvent;
    }

    private void OnGameEvent(object? sender, GameEvent e)
    {
        string? line = e switch
        {
            ItemPickedUpEvent p => $"{p.Character.Name} picked up a {p.Item}.",
            ItemDroppedEvent d => $"{d.Character.Name} dropped {d.Item}.",
            HpChangedEvent h => $"{h.Character.Name} HP changed by {h.Delta} (now {h.NewHp}).",
            ActiveItemChangedEvent a => a.Item is null
                ? $"{a.Character.Name} unequipped their item."
                : $"{a.Item} equipped on {a.Character.Name}.",
            AttackEvent at => $"{at.Attacker} attacked {at.Target} for {at.DamageDealt} damage.",
            CharacterDiedEvent cd => $"{cd.Character.Name} was defeated.",
            _ => null,
        };

        if (line is not null && !IsDisposed)
        {
            _log.Items.Add(line);
            _log.TopIndex = _log.Items.Count - 1;
        }
    }
}
