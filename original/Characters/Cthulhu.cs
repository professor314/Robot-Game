using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CSharpRPG.Characters
{
    class Cthulhu : Character
    {
        private const int ENEMY = 50;// cthulhu-like guy

        public override string charName
        {
            get { return "Cthulhu"; }
        }


        public override int unarmedDamage
        {
            //1.5 damage points per level, rounded;
            get { return (int)Math.Round(Level*1.5,0); }
        }

        public override int TileID
        {
            get { return ENEMY; }
        }

        public override int Capacity
        {
            get { return 0; }
        }
        public override int Level
        {
            get { return 5; }
        }

        public override int MaxHP
        {
            get { return 35; }
        }

        
    
    }

}
