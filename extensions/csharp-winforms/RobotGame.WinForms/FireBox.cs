namespace RobotGame.WinForms;

/// <summary>
/// A picture box that paints a 2-D grid of background colors with optional tile images drawn on
/// top of each cell, and optional cell borders. Ported from the original FireBox control
/// (Steve Kollmansberger), modernized with nullability.
/// </summary>
public sealed class FireBox : PictureBox
{
    private Color[,] _background = new Color[0, 0];
    private Image?[,] _images = new Image?[0, 0];

    /// <summary>Whether to draw a black outline around every cell.</summary>
    public bool BoxBorder { get; set; } = true;

    /// <summary>The grid of background colors. Setting it repaints.</summary>
    public Color[,] Background
    {
        set { _background = value; Refresh(); }
    }

    /// <summary>The grid of overlay images (null entries draw nothing). Setting it repaints.</summary>
    public Image?[,] Images
    {
        set { _images = value; Refresh(); }
    }

    /// <summary>Arguments for a cell click, giving the grid coordinates.</summary>
    public sealed class BoxClickEventArgs : EventArgs
    {
        public int X { get; init; }
        public int Y { get; init; }
    }

    /// <summary>Raised when a grid cell is clicked.</summary>
    public event EventHandler<BoxClickEventArgs>? BoxClick;

    public FireBox()
    {
        Paint += OnPaint;
        MouseClick += OnMouseClick;
    }

    private void OnMouseClick(object? sender, MouseEventArgs e)
    {
        if (_background.GetLength(0) == 0) return;
        int bw = Width / _background.GetLength(0);
        int bh = Height / _background.GetLength(1);
        if (bw == 0 || bh == 0) return;
        BoxClick?.Invoke(this, new BoxClickEventArgs { X = e.X / bw, Y = e.Y / bh });
    }

    private void OnPaint(object? sender, PaintEventArgs e)
    {
        int cols = _background.GetLength(0);
        int rows = _background.GetLength(1);
        if (cols == 0 || rows == 0) return;

        float bw = (float)Width / cols;
        float bh = (float)Height / rows;

        for (int x = 0; x < cols; x++)
            for (int y = 0; y < rows; y++)
            {
                using (var brush = new SolidBrush(_background[x, y]))
                    e.Graphics.FillRectangle(brush, x * bw, y * bh, bw, bh);

                if (x < _images.GetLength(0) && y < _images.GetLength(1) && _images[x, y] is { } img)
                    e.Graphics.DrawImage(img, x * bw, y * bh, bw, bh);

                if (BoxBorder)
                    e.Graphics.DrawRectangle(Pens.Black, x * bw, y * bh, bw, bh);
            }
    }
}
