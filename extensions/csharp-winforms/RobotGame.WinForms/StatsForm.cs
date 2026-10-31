using RobotGame.Core;

namespace RobotGame.WinForms;

/// <summary>
/// Shows a character's HP, an HP bar, and inventory as an icon list. Allows equipping
/// (double-click), unequipping (button), and dropping (Delete key). Updates live as the
/// character's state changes. Ported from the original frmStats.
/// </summary>
public sealed class StatsForm : Form
{
    private readonly TileSet _tiles;
    private readonly Character _character;

    private readonly Label _lblHp = new() { AutoSize = true, Location = new Point(12, 12) };
    private readonly ProgressBar _bar = new() { Location = new Point(12, 36), Width = 300 };
    private readonly ListView _list = new()
    {
        Location = new Point(12, 72),
        Size = new Size(300, 180),
        View = View.LargeIcon,
    };
    private readonly Button _btnUnequip = new() { Text = "Unequip", Location = new Point(12, 260), Width = 100 };

    public StatsForm(TileSet tiles, Character character)
    {
        _tiles = tiles;
        _character = character;

        Text = "Stats";
        ClientSize = new Size(324, 300);
        FormBorderStyle = FormBorderStyle.FixedToolWindow;

        _btnUnequip.Click += (_, _) => _character.ActiveItem = null;
        _list.MouseDoubleClick += OnListDoubleClick;
        _list.KeyUp += OnListKeyUp;

        Controls.Add(_lblHp);
        Controls.Add(_bar);
        Controls.Add(_list);
        Controls.Add(_btnUnequip);

        Load += (_, _) =>
        {
            LoadData();
            // Live updates: refresh whenever this character raises an event via the world sink.
            if (_character.Events is GameWorld world)
                world.GameEventRaised += OnWorldEvent;
        };

        FormClosed += (_, _) =>
        {
            if (_character.Events is GameWorld world)
                world.GameEventRaised -= OnWorldEvent;
        };
    }

    private void OnWorldEvent(object? sender, GameEvent e)
    {
        if (!IsDisposed) LoadData();
    }

    private void LoadData()
    {
        _lblHp.Text = $"HP: {_character.HP} / {_character.MaxHp}";
        _bar.Maximum = _character.MaxHp;
        _bar.Value = Math.Clamp(_character.HP, 0, _character.MaxHp);

        _list.Items.Clear();
        var imageList = new ImageList { ImageSize = new Size(32, 32) };
        _list.LargeImageList = imageList;

        foreach (Item item in _character.Inventory)
        {
            string key = item.TileId.ToString();
            if (!imageList.Images.ContainsKey(key))
                imageList.Images.Add(key, _tiles.GetTile(item.TileId));

            var lvi = new ListViewItem(item.ToString(), key);
            if (ReferenceEquals(item, _character.ActiveItem))
            {
                lvi.BackColor = Color.Chocolate;
                lvi.ForeColor = Color.White;
            }
            _list.Items.Add(lvi);
        }
    }

    private void OnListDoubleClick(object? sender, MouseEventArgs e)
    {
        if (_list.SelectedIndices.Count > 0)
            _character.ActiveItem = _character.Inventory[_list.SelectedIndices[0]];
    }

    private void OnListKeyUp(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode != Keys.Delete) return;
        if (_list.SelectedIndices.Count != 1)
        {
            MessageBox.Show(this, "Select exactly one item to drop.", "Stats");
            return;
        }
        _character.RemoveItemAt(_list.SelectedIndices[0]);
    }
}
