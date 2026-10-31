using RobotGame.Core;

namespace RobotGame.WinForms;

/// <summary>
/// The main game window: renders the dungeon, handles arrow-key movement, runs the enemy
/// movement timer, and opens the stats and log windows. Ported from the original Form1 with
/// all database code removed and state owned by <see cref="GameWorld"/>.
/// </summary>
public sealed class GameForm : Form
{
    private readonly GameWorld _world;
    private readonly TileSet _tiles;
    private readonly MapRenderer _renderer;
    private readonly FireBox _fireBox;
    private readonly System.Windows.Forms.Timer _enemyTimer;

    private StatsForm? _statsForm;
    private LogForm? _logForm;

    public GameForm()
    {
        // Load the tile sheet relative to the executable (fixes the original "../../tiles32.png").
        string tilePath = Path.Combine(AppContext.BaseDirectory, "tiles32.png");
        var bmp = new Bitmap(tilePath);
        _tiles = new TileSet(bmp, 32, 32, Color.FromArgb(66, 107, 107));

        _world = SeedData.CreateWorld();
        _renderer = new MapRenderer(_world.Map, _tiles);

        _fireBox = new FireBox
        {
            BoxBorder = false,
            Dock = DockStyle.Fill,
            SizeMode = PictureBoxSizeMode.Normal,
        };

        var btnStats = new Button { Text = "Stats", Dock = DockStyle.Left, Width = 90 };
        btnStats.Click += (_, _) => OpenStats();
        var btnLog = new Button { Text = "Log", Dock = DockStyle.Left, Width = 90 };
        btnLog.Click += (_, _) => OpenLog();

        var buttonPanel = new Panel { Dock = DockStyle.Bottom, Height = 36 };
        buttonPanel.Controls.Add(btnLog);
        buttonPanel.Controls.Add(btnStats);

        Controls.Add(_fireBox);
        Controls.Add(buttonPanel);

        Text = "Robot-Game — CSharpRPG (.NET 8 port)";
        ClientSize = new Size(600, 636);
        KeyPreview = true;
        DoubleBuffered = true;

        _world.GameEventRaised += OnGameEvent;

        _enemyTimer = new System.Windows.Forms.Timer { Interval = 1000 };
        _enemyTimer.Tick += (_, _) =>
        {
            _world.EnemyTurn();
            RefreshBoard();
        };

        Load += (_, _) =>
        {
            // The log form subscribes to world events for its history.
            _logForm = new LogForm(_world);
            RefreshBoard();
            _enemyTimer.Start();
        };
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        GridPoint pos = _world.Player.Position;
        GridPoint? dest = keyData switch
        {
            Keys.Up => pos.Offset(0, -1),
            Keys.Down => pos.Offset(0, 1),
            Keys.Left => pos.Offset(-1, 0),
            Keys.Right => pos.Offset(1, 0),
            _ => null,
        };

        if (dest is { } d && !_world.IsGameOver)
        {
            _world.MoveCharacter(_world.Player, d);
            RefreshBoard();
            return true;
        }

        return base.ProcessCmdKey(ref msg, keyData);
    }

    private void OnGameEvent(object? sender, GameEvent e)
    {
        if (e is CharacterDiedEvent died && died.Character == _world.Player)
        {
            _enemyTimer.Stop();
            MessageBox.Show(this, "You were defeated. Game over.", "Robot-Game",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }

    private void RefreshBoard()
    {
        _fireBox.Background = _renderer.GetColors();
        _fireBox.Images = _renderer.GetImages();
    }

    private void OpenStats()
    {
        if (_statsForm is null || _statsForm.IsDisposed)
            _statsForm = new StatsForm(_tiles, _world.Player);
        _statsForm.Show();
        _statsForm.Focus();
    }

    private void OpenLog()
    {
        _logForm ??= new LogForm(_world);
        _logForm.Show();
        _logForm.Focus();
    }
}
