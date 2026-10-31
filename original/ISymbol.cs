using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;

namespace CSharpRPG
{
    interface ISymbol
    {
        Color Color { get; }
        int? TileID { get; }
        bool Enter(Character chr);

    }
}
