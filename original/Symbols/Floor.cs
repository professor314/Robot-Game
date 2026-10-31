using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;

namespace CSharpRPG.Symbols
{
    class Floor : ISymbol
    {
        #region Symbol Members

        public System.Drawing.Color Color
        {
            get { return Color.DarkGray; }
        }

        public int? TileID
        {
            get { return null; }
        }

        public bool Enter(Character chr)
        {
            return true;
        }

        #endregion
    }
}
