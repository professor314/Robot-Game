using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;

namespace CSharpRPG.Symbols
{
    class Wall : ISymbol
    {
        public enum Walls
        {
            WALL_VERT = 830,
            WALL_HORZ = 831,
            WALL_TOP_CORNER = 832,
            WALL_BOTTOM_CORNER = 834
            
        };

        private Walls MyType;
        public Wall(Walls type)
        {
            MyType = type;
        }

        #region Symbol Members

        public System.Drawing.Color Color
        {
            get { return Color.Black; }
        }

        public int? TileID
        {
            get { return (int)MyType; }
        }

        public bool Enter(Character chr)
        {
            return false;
        }

        #endregion
    }
}
