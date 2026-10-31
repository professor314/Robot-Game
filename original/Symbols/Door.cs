using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;
using System.Windows.Forms;

namespace CSharpRPG.Symbols
{
   class Door : ISymbol
    {
       
      
        protected Doors _doors = Doors.DOOR_CLOSED;// doors start out closed.
        // keeps track of door entry status:
        protected bool doorFlag = false; // closed.
        // For orientation of door:
        protected bool _orient; // false = horizontal open, true = vertical open

        public enum Doors
        {
            DOOR_CLOSED = 845,
            DOOR_OPEN_VERT = 843,
            DOOR_OPEN_HORT = 842
        };

        /// <summary>
        /// Constructor for door class.
        /// </summary>
        /// <param name="orientType">false = horizontal opening, true = vertical opening</param>
        public Door(bool orientType)
        {
            
            if (orientType)
                _orient = true;
            else
                _orient = false;
        }
        
        #region Symbol Members

        public System.Drawing.Color Color
        {
            get { if (doorFlag)
                return Color.DarkGray;
                else
                return Color.Black;
            }
        }

        public int? TileID
        {
            get { return (int)_doors; }
            set { _doors = (Doors)value; }
        }

        public virtual bool Enter(Character chr)
        {
            // if door flag is set to false (closed)
            if (!doorFlag)
            {
                // Set door flag to true and set tile according to 
                // the door orientation set by constructor.
                doorFlag = true;
                if (_orient)
                    TileID = (int)Doors.DOOR_OPEN_VERT;
                else
                    TileID = (int)Doors.DOOR_OPEN_HORT;
                return false;
                
            }
            else // door is open.
                return true;

        }

        #endregion
      }
}
