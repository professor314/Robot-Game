using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;

namespace CSharpRPG
{
    /** Tileset system
     * Steve Kollmansberger
     * */

    public class TileSet
    {
        // The source tile image
        private Image _src;

        // The width and height of each individual tile
        private int _tw, _th;

        public TileSet(Image Src, int TileWidth, int TileHeight)
        {
            _src = Src;
            _tw = TileWidth;
            _th = TileHeight;
        }

        public TileSet(Bitmap Src, int TileWidth, int TileHeight, Color Transparent)
        {
            // we want to use transparency without
            // altering the original, so we make a clone
            Bitmap nsrc = (Bitmap)Src.Clone();
            nsrc.MakeTransparent(Transparent);
            _src = nsrc; 
            _tw = TileWidth;
            _th = TileHeight;
            
        }

        /// <summary>
        /// The number of tiles "wide" (in the X direction)
        /// </summary>
        public int Width 
        {
            get
            {
                return _src.Width / _tw;
            }
        }

        /// <summary>
        /// The number of tiles "tall" (in the Y direction)
        /// </summary>
        public int Height
        {
            get
            {
                return _src.Height / _th;
            }
        }

        /// <summary>
        /// The total number of tiles
        /// </summary>
        public int NumTiles
        {
            get
            {
                return Width * Height;
            }
        }

        private Dictionary<Point, Image> _tiles = new Dictionary<Point, Image>();

        /// <summary>
        /// Get a specific tile image
        /// </summary>
        /// <param name="x">The X tile coordinate.  Must be 0..Width-1</param>
        /// <param name="y">The Y tile coordinate.  Must be 0..Height-1</param>
        /// <returns>The tile image</returns>
        public Image GetTile(int x, int y)
        {

            if (x < 0 || y < 0 || x >= Width || y >= Height)
                throw new ArgumentOutOfRangeException("Must be within tileset grid");

            if (_tiles.ContainsKey(new Point(x, y)))
                return _tiles[new Point(x, y)];

            // create a new bitmap the appropriate size
            Image b = new Bitmap(_tw, _th);
            Graphics g_dest = Graphics.FromImage(b);
            
            // create copy rectangles -- one for the source
            // from the origin image, and one for the
            // destination (the returned image)
            Rectangle dst = new Rectangle(0,0,_tw,_th);
            Rectangle src = new Rectangle(x * _tw, y * _th, _tw, _th);

            g_dest.DrawImage(_src, dst, src, GraphicsUnit.Pixel);

            
            g_dest.Dispose();
            _tiles[new Point(x, y)] = b;
            return b;

        }

        /// <summary>
        /// Gets a particular tile by ID. ID counts
        /// from 0 to the right and then down.
        /// </summary>
        /// <param name="number">The ID number (position) of the tile to retrieve</param>
        /// <returns>The tile image</returns>
        public Image GetTile(int number)
        {
            return GetTile(number % Width, number / Width);
        }
    }
}
