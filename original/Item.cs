using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CSharpRPG
{
    public class Item
    {
        //Overload the == operator
        public static bool operator ==(Item a, Item b)
        {
            if (Object.ReferenceEquals(a, null))
            {
                if (Object.ReferenceEquals(b, null))
                    return true;
                else return false;
            }
            
            
            return a.Equals(b);
          
        }
        //You must overload the != Operator too
        public static bool operator !=(Item a, Item b)
        { return !(a == b); }

        //This one should be overridden
        public override bool Equals(object obj)
        {
            if (obj == null)
                return false;
            Item a = (Item)obj;

            if (this._name == a._name &&
                this.TileId == a.TileId)
                return true;
            else return false;
         
        }
        //This one should be overloaded
        public override int GetHashCode()
        {
            string hv = _name + TileId.ToString();
            return hv.GetHashCode();
        }

        private string _name;

        public int TileId { get; set; }

        public Item(string name, int tile)
        {
            _name = name;
            TileId = tile;
        }

        public override string ToString()
        {
            return _name;
        }

        public virtual int Attack(Character c)
        {
            // default: no damage, assume item useless for combat and that the player cannot attack since his/her hands are full.
            return 0;
        }
      
    }
}
